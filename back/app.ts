import 'reflect-metadata';
import cluster, { type Worker } from 'cluster';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Container } from 'typedi';
import config from './config';
import Logger from './loaders/logger';
import { monitoringMiddleware } from './middlewares/monitoring';
import { type GrpcServerService } from './services/grpc';
import { type HttpServerService } from './services/http';

interface WorkerMetadata {
  id: number;
  pid: number;
  serviceType: string;
  startTime: Date;
}

// 5 分钟滑动窗口内最多自动重启 2 次，超限则放弃
const GRPC_RESTART_WINDOW_MS = 5 * 60 * 1000;
const GRPC_RESTART_MAX = 2;

class Application {
  private app: express.Application;
  private httpServerService?: HttpServerService;
  private grpcServerService?: GrpcServerService;
  private isShuttingDown = false;
  private workerMetadataMap = new Map<number, WorkerMetadata>();
  private httpWorker?: Worker;
  /** 记录 gRPC worker 每次重启的时间戳，用于滑动窗口限流 */
  private grpcRestartTimestamps: number[] = [];

  constructor() {
    this.app = express();
    // 创建一个全局中间件，删除查询参数中的t
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.query.t) {
        delete req.query.t;
      }
      next();
    });
  }

  async start() {
    try {
      if (cluster.isPrimary) {
        await this.initializeDatabase();
      }
      if (cluster.isPrimary) {
        this.startMasterProcess();
      } else {
        await this.startWorkerProcess();
      }
    } catch (error) {
      Logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  /**
   * 检查 gRPC worker 是否仍在允许重启的范围内。
   * 滑动窗口：GRPC_RESTART_WINDOW_MS 内超过 GRPC_RESTART_MAX 次则返回 false。
   */
  private canRestartGrpc(): boolean {
    const now = Date.now();
    this.grpcRestartTimestamps = this.grpcRestartTimestamps.filter(
      (t) => now - t < GRPC_RESTART_WINDOW_MS,
    );
    return this.grpcRestartTimestamps.length < GRPC_RESTART_MAX;
  }

  private recordGrpcRestart() {
    this.grpcRestartTimestamps.push(Date.now());
  }

  /**
   * 启动 gRPC worker 并等待就绪；超时后最多自动重试一次。
   * 受滑动窗口限流保护，避免死循环。
   */
  private async startGrpcWorkerWithRetry(): Promise<Worker> {
    const tryStart = async (): Promise<Worker> => {
      const worker = this.forkWorker('grpc');
      await this.waitForWorkerReady(worker, 30000);
      return worker;
    };

    try {
      return await tryStart();
    } catch (err) {
      Logger.error('✌️ gRPC worker 启动超时，尝试自动重启一次…', err);

      if (!this.canRestartGrpc()) {
        Logger.error(
          `✌️ gRPC worker 在 ${GRPC_RESTART_WINDOW_MS / 60000} 分钟内已重启 ${GRPC_RESTART_MAX} 次，放弃自动重启`,
        );
        throw err;
      }

      this.recordGrpcRestart();
      Logger.info('✌️ 正在重新启动 gRPC worker…');
      return await tryStart();
    }
  }

  private startMasterProcess() {
    // Fork gRPC worker first and wait for it to be ready（支持自动重试一次）
    this.startGrpcWorkerWithRetry()
      .then(() => {
        Logger.info('✌️ gRPC worker is ready, starting HTTP worker');
        this.httpWorker = this.forkWorker('http');
      })
      .catch((error) => {
        Logger.error('✌️ Failed to wait for gRPC worker:', error);
        process.exit(1);
      });

    cluster.on('exit', (worker, code, signal) => {
      const metadata = this.workerMetadataMap.get(worker.id);
      if (metadata) {
        if (!this.isShuttingDown) {
          Logger.error(
            `✌️ ${metadata.serviceType} worker ${worker.process.pid} died (${signal || code
            }). Restarting...`,
          );
          // If gRPC worker died, restart it and wait for it to be ready
          if (metadata.serviceType === 'grpc') {
            if (!this.canRestartGrpc()) {
              Logger.error(
                `✌️ gRPC worker 在 ${GRPC_RESTART_WINDOW_MS / 60000} 分钟内已重启 ${GRPC_RESTART_MAX} 次，停止自动重启`,
              );
              process.exit(1);
              return;
            }
            this.recordGrpcRestart();
            const newGrpcWorker = this.forkWorker('grpc');
            this.waitForWorkerReady(newGrpcWorker, 30000)
              .then(() => {
                Logger.info('✌️ gRPC worker restarted and ready');
                // Re-register cron jobs by notifying the HTTP worker
                if (this.httpWorker) {
                  try {
                    this.httpWorker.send('reregister-crons');
                    Logger.info('✌️ Sent reregister-crons message to HTTP worker');
                  } catch (error) {
                    Logger.error('✌️ Failed to send reregister-crons message:', error);
                  }
                }
              })
              .catch((error) => {
                Logger.error('✌️ Failed to restart gRPC worker:', error);
                process.exit(1);
              });
          } else {
            // For HTTP worker, just restart it
            const newWorker = this.forkWorker(metadata.serviceType);
            this.httpWorker = newWorker;
            Logger.info(`✌️ Restarted ${metadata.serviceType} worker (PID: ${newWorker.process.pid})`);
          }
        }

        this.workerMetadataMap.delete(worker.id);
      }
    });

    this.setupMasterShutdown();
  }

  private waitForWorkerReady(worker: Worker, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const messageHandler = (msg: any) => {
        if (msg === 'ready') {
          worker.removeListener('message', messageHandler);
          clearTimeout(timeoutId);
          resolve();
        }
      };
      worker.on('message', messageHandler);
      
      // Timeout after specified milliseconds
      const timeoutId = setTimeout(() => {
        worker.removeListener('message', messageHandler);
        reject(new Error(`Worker failed to start within ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });
  }

  private forkWorker(serviceType: string): Worker {
    const worker = cluster.fork({ SERVICE_TYPE: serviceType });

    this.workerMetadataMap.set(worker.id, {
      id: worker.id,
      pid: worker.process.pid!,
      serviceType,
      startTime: new Date(),
    });

    return worker;
  }

  private async initializeDatabase() {
    const dbLoader = await import('./loaders/db');
    await dbLoader.default();
  }

  private setupMiddlewares() {
    this.app.use(helmet({
      contentSecurityPolicy: false,
    }));
    this.app.use(cors(config.cors));
    this.app.use(compression());
    this.app.use(monitoringMiddleware);
  }

  private setupMasterShutdown() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      const workers = Object.values(cluster.workers || {});
      const workerPromises: Promise<void>[] = [];

      workers.forEach((worker) => {
        if (worker) {
          const exitPromise = new Promise<void>((resolve) => {
            worker.once('exit', () => {
              Logger.info(`✌️ Worker ${worker.process.pid} exited`);
              resolve();
            });

            try {
              worker.send('shutdown');
            } catch (error) {
              Logger.warn(
                `✌️ Failed to send shutdown to worker ${worker.process.pid}:`,
                error,
              );
            }
          });

          workerPromises.push(exitPromise);
        }
      });

      try {
        await Promise.race([
          Promise.all(workerPromises),
          new Promise<void>((resolve) => {
            setTimeout(() => {
              Logger.warn('✌️ Worker shutdown timeout reached');
              resolve();
            }, 10000);
          }),
        ]);
        process.exit(0);
      } catch (error) {
        Logger.error('✌️ Error during worker shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  private async startWorkerProcess() {
    const serviceType = process.env.SERVICE_TYPE;
    if (!serviceType || !['http', 'grpc'].includes(serviceType)) {
      Logger.error('✌️ Invalid SERVICE_TYPE:', serviceType);
      process.exit(1);
    }

    Logger.info(`✌️ ${serviceType} worker started (PID: ${process.pid})`);

    try {
      if (serviceType === 'http') {
        await this.startHttpService();
      } else {
        await this.startGrpcService();
      }

      process.send?.('ready');
    } catch (error) {
      Logger.error(`✌️ ${serviceType} worker failed:`, error);
      process.exit(1);
    }
  }

  private async startHttpService() {
    this.setupMiddlewares();

    const { HttpServerService } = await import('./services/http');
    this.httpServerService = Container.get(HttpServerService);

    const appLoader = await import('./loaders/app');
    await appLoader.default({ app: this.app });

    const server = await this.httpServerService.initialize(
      this.app,
      config.port,
    );

    const serverLoader = await import('./loaders/server');
    await (serverLoader.default as any)({ server });
    this.setupWorkerShutdown('http');
  }

  private async startGrpcService() {
    const { GrpcServerService } = await import('./services/grpc');
    this.grpcServerService = Container.get(GrpcServerService);

    await this.grpcServerService.initialize();
    this.setupWorkerShutdown('grpc');
  }

  private setupWorkerShutdown(serviceType: string) {
    process.on('message', async (msg) => {
      if (msg === 'shutdown') {
        this.gracefulShutdown(serviceType);
      } else if (msg === 'reregister-crons' && serviceType === 'http') {
        // Re-register cron jobs when gRPC worker restarts
        try {
          Logger.info('✌️ Received reregister-crons message, re-registering cron jobs...');
          const CronService = (await import('./services/cron')).default;
          const cronService = Container.get(CronService);
          await cronService.autosave_crontab();
          Logger.info('✌️ Cron jobs re-registered successfully');
        } catch (error) {
          Logger.error('✌️ Failed to re-register cron jobs:', error);
        }
      }
    });

    const shutdown = () => this.gracefulShutdown(serviceType);
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  private async gracefulShutdown(serviceType: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      if (serviceType === 'http') {
        await this.httpServerService?.shutdown();
      } else {
        await this.grpcServerService?.shutdown();
      }
      process.exit(0);
    } catch (error) {
      Logger.error(`✌️ [${serviceType}] Error during shutdown:`, error);
      process.exit(1);
    }
  }
}

const app = new Application();
app.start().catch((error) => {
  Logger.error('🙅‍♀️ Application failed to start:', error);
  process.exit(1);
});
