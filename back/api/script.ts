import { fileExist, readDirs, readDir, rmPath, IFile } from '../config/util';
import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import config from '../config';
import * as fs from 'fs/promises';
import { celebrate, Joi } from 'celebrate';
import nodePath, { join, parse } from 'path';
import ScriptService from '../services/script';
import multer from 'multer';
import { writeFileWithLock } from '../shared/utils';
const route = Router();

// 文件上传安全：扩展名白名单
const ALLOWED_EXTENSIONS = [
  '.js', '.ts', '.py', '.sh', '.json', '.yaml', '.yml', '.txt', '.csv',
  '.mjs', '.cjs', '.jsx', '.tsx',
];

function sanitizeFilename(filename: string): string {
  // 提取纯文件名，移除路径遍历字符
  return nodePath.basename(filename).replace(/\0/g, '');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.scriptPath);
  },
  filename: function (req, file, cb) {
    cb(null, sanitizeFilename(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const ext = nodePath.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不允许上传 ${ext} 类型的文件`));
    }
  },
});

export default (app: Router) => {
  app.use('/scripts', route);

  route.get(
    '/',
    celebrate({
      query: Joi.object({
        path: Joi.string().optional().allow(''),
      }).unknown(true),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        let result: IFile[] = [];
        const blacklist = [
          'node_modules',
          '.git',
          '.pnpm',
          'pnpm-lock.yaml',
          'yarn.lock',
          'package-lock.json',
        ];
        if (req.query.path) {
          const queryPath = req.query.path as string;
          // 路径遍历检查
          const resolvedPath = nodePath.resolve(config.scriptPath, queryPath);
          if (!resolvedPath.startsWith(config.scriptPath)) {
            return res.send({ code: 403, message: '路径不合法' });
          }
          result = await readDir(
            queryPath,
            config.scriptPath,
            blacklist,
          );
        } else {
          result = await readDirs(
            config.scriptPath,
            config.scriptPath,
            blacklist,
            (a, b) => {
              if (a.type === b.type) {
                return a.title.localeCompare(b.title);
              } else {
                return a.type === 'directory' ? -1 : 1;
              }
            },
          );
        }
        res.send({
          code: 200,
          data: result,
        });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    });

  route.get(
    '/detail',
    celebrate({
      query: Joi.object({
        path: Joi.string().optional().allow(''),
        file: Joi.string().required(),
      }).unknown(true),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const scriptService = Container.get(ScriptService);
        const content = await scriptService.getFile(
          req.query?.path as string || '',
          req.query.file as string,
        );
        res.send({ code: 200, data: content });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.get(
    '/:file',
    celebrate({
      params: Joi.object({
        file: Joi.string().required(),
      }),
      query: Joi.object({
        path: Joi.string().optional().allow(''),
      }).unknown(true),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const scriptService = Container.get(ScriptService);
        const content = await scriptService.getFile(
          req.query?.path as string || '',
          req.params.file,
        );
        res.send({ code: 200, data: content });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.post(
    '/',
    upload.single('file'),
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional().allow(''),
        content: Joi.string().optional().allow(''),
        originFilename: Joi.string().optional().allow(''),
        directory: Joi.string().optional().allow(''),
        file: Joi.string().optional().allow(''),
      }).unknown(true),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, path, content, originFilename, directory } =
          req.body as {
            filename: string;
            path: string;
            content: string;
            originFilename: string;
            directory: string;
          };

        if (!path) {
          path = config.scriptPath;
        } else if (!nodePath.isAbsolute(path)) {
          path = join(config.scriptPath, path);
        }
        if (!path.endsWith('/') && !path.endsWith(nodePath.sep)) {
          path += nodePath.sep;
        }
        if (config.writePathList.every((x) => !path.startsWith(x))) {
          return res.send({
            code: 403,
            message: '暂无权限',
          });
        }

        if (req.file) {
          await fs.rename(req.file.path, join(path, filename));
          return res.send({ code: 200 });
        }

        if (directory) {
          await fs.mkdir(join(path, directory), { recursive: true });
          return res.send({ code: 200 });
        }

        if (!originFilename) {
          originFilename = filename;
        }
        // 安全过滤：使用 basename 防止路径遍历
        const safeOriginFilename = sanitizeFilename(originFilename);
        const safeFilename = sanitizeFilename(filename);
        const originFilePath = join(path, safeOriginFilename);
        await fs.mkdir(path, { recursive: true });
        const filePath = join(path, safeFilename);
        // 二次校验：确保最终路径在允许的目录内
        if (config.writePathList.every((x) => !filePath.startsWith(x))) {
          return res.send({ code: 403, message: '暂无权限' });
        }
        const fileExists = await fileExist(filePath);
        if (fileExists) {
          await fs.copyFile(
            originFilePath,
            join(config.bakPath, safeOriginFilename),
          );
          if (safeFilename !== safeOriginFilename) {
            await rmPath(originFilePath);
          }
        }
        await writeFileWithLock(filePath, content);
        return res.send({ code: 200 });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.put(
    '/',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional().allow(''),
        content: Joi.string().required().allow(''),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, content, path } = req.body as {
          filename: string;
          content: string;
          path: string;
        };
        const scriptService = Container.get(ScriptService);
        const filePath = scriptService.checkFilePath(path, filename);
        if (!filePath) {
          return res.send({
            code: 403,
            message: '暂无权限',
          });
        }
        await writeFileWithLock(filePath, content);
        return res.send({ code: 200 });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.delete(
    '/',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional().allow(''),
        type: Joi.string().optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, path } = req.body as {
          filename: string;
          path: string;
        };
        if (!path) {
          path = '';
        }
        const scriptService = Container.get(ScriptService);
        const filePath = scriptService.checkFilePath(path, filename);
        if (!filePath) {
          return res.send({
            code: 403,
            message: '暂无权限',
          });
        }
        await rmPath(filePath);
        res.send({ code: 200 });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.post(
    '/download',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional().allow(''),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, path } = req.body as {
          filename: string;
          path: string;
        };
        if (!path) {
          path = '';
        }
        const scriptService = Container.get(ScriptService);
        const filePath = scriptService.checkFilePath(path, filename);
        if (!filePath) {
          return res.send({
            code: 403,
            message: '暂无权限',
          });
        }
        return res.download(filePath, filename, (err) => {
          if (err) {
            return next(err);
          }
        });
      } catch (e) {
        return next(e);
      }
    },
  );

  route.put(
    '/run',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        content: Joi.string().optional().allow(''),
        path: Joi.string().optional().allow(''),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        let { filename, content, path } = req.body;
        if (!path) {
          path = '';
        }
        const { name, ext } = parse(filename);
        const filePath = join(config.scriptPath, path, `${name}.swap${ext}`);
        await writeFileWithLock(filePath, content || '');

        const scriptService = Container.get(ScriptService);
        const result = await scriptService.runScript(filePath);
        res.send(result);
      } catch (e) {
        return next(e);
      }
    },
  );

  route.put(
    '/stop',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional().allow(''),
        pid: Joi.number().optional().allow(''),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, path, pid } = req.body;
        if (!path) {
          path = '';
        }
        const { name, ext } = parse(filename);
        const filePath = join(config.scriptPath, path, `${name}.swap${ext}`);
        const logPath = join(config.logPath, path, `${name}.swap`);

        const scriptService = Container.get(ScriptService);
        const result = await scriptService.stopScript(filePath, pid);
        setTimeout(() => {
          rmPath(logPath);
        }, 3000);
        res.send(result);
      } catch (e) {
        return next(e);
      }
    },
  );

  route.put(
    '/rename',
    celebrate({
      body: Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().allow(''),
        newFilename: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        let { filename, path, newFilename } = req.body as {
          filename: string;
          path: string;
          newFilename: string;
        };
        if (!path) {
          path = '';
        }
        // 安全过滤：使用 basename 防止路径遍历
        const safeFilename = sanitizeFilename(filename);
        const safeNewFilename = sanitizeFilename(newFilename);
        const filePath = join(config.scriptPath, path, safeFilename);
        const newPath = join(config.scriptPath, path, safeNewFilename);
        // 确保路径在 scriptPath 内
        if (!filePath.startsWith(config.scriptPath) || !newPath.startsWith(config.scriptPath)) {
          return res.send({ code: 403, message: '路径不合法' });
        }
        await fs.rename(filePath, newPath);
        res.send({ code: 200 });
      } catch (e) {
        return next(e);
      }
    },
  );
};
