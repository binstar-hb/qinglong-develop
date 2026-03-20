import intl from 'react-intl-universal';
import React, { useState } from 'react';
import {
  Button,
  Upload,
  Modal,
  Checkbox,
  message,
  Statistic,
  Typography,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import config from '@/utils/config';
import { request } from '@/utils/http';
import { saveAs } from 'file-saver';
import useProgress from './progress';
import { disableBody } from '@/utils';

const { Countdown } = Statistic;
const { Title, Paragraph, Text } = Typography;

const exportModules = [
  { value: 'base', label: intl.get('基础数据'), disabled: true },
  { value: 'config', label: intl.get('配置文件') },
  { value: 'scripts', label: intl.get('脚本文件') },
  { value: 'log', label: intl.get('日志文件') },
  { value: 'deps', label: intl.get('依赖文件') },
  { value: 'syslog', label: intl.get('系统日志') },
  { value: 'dep_cache', label: intl.get('依赖缓存') },
  { value: 'raw', label: intl.get('远程脚本缓存') },
  { value: 'repo', label: intl.get('远程仓库缓存') },
  { value: 'ssh.d', label: intl.get('SSH 文件缓存') },
];

const Backup = () => {
  const [exportLoading, setExportLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const showUploadProgress = useProgress(intl.get('上传'));
  const showDownloadProgress = useProgress(intl.get('下载'));
  const [visible, setVisible] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>(['base', 'config', 'scripts', 'deps']);

  const exportData = () => {
    setExportLoading(true);
    request
      .put<Blob>(
        `${config.apiPrefix}system/data/export`,
        { type: selectedModules },
        {
          responseType: 'blob',
          timeout: 86400000,
          onDownloadProgress: (e) => {
            if (e.progress) {
              showDownloadProgress(parseFloat((e.progress * 100).toFixed(1)));
            }
          },
        },
      )
      .then((res) => {
        saveAs(res, 'data.tgz');
      })
      .catch((error: any) => {
        console.log(error);
      })
      .finally(() => {
        setExportLoading(false);
        setVisible(false);
      });
  };

  const showReloadModal = () => {
    Modal.confirm({
      width: 600,
      maskClosable: false,
      title: intl.get('确认重启'),
      centered: true,
      content: (
        <>
          <div>{intl.get('备份数据上传成功，确认覆盖数据')}</div>
          <div>{intl.get('如果恢复失败，可进入容器执行')} ql reload data</div>
        </>
      ),
      okText: intl.get('重启'),
      onOk() {
        request
          .put(`${config.apiPrefix}update/data`)
          .then(() => {
            message.success({
              content: (
                <span>
                  {intl.get('系统将在')}
                  <Countdown
                    className="inline-countdown"
                    format="ss"
                    value={Date.now() + 1000 * 30}
                  />
                  {intl.get('秒后自动刷新')}
                </span>
              ),
              duration: 30,
            });
            disableBody();
            setTimeout(() => {
              window.location.reload();
            }, 30000);
          })
          .catch((error: any) => {
            console.log(error);
          });
      },
    });
  };

  const resetData = () => {
    Modal.confirm({
      width: 500,
      maskClosable: false,
      title: intl.get('确认清空数据'),
      centered: true,
      content: (
        <>
          <div style={{ color: '#ff4d4f', fontWeight: 500, marginBottom: 8 }}>
            {intl.get('此操作将删除所有数据，包括定时任务、环境变量、脚本文件、依赖、配置文件等，恢复为初始状态。')}
          </div>
          <div>{intl.get('清空后系统将自动重启，需要重新设置账号密码。')}</div>
          <div>{intl.get('建议先备份数据再执行此操作。')}</div>
        </>
      ),
      okText: intl.get('确认清空'),
      okButtonProps: { danger: true },
      onOk() {
        setResetLoading(true);
        request
          .put(`${config.apiPrefix}system/data/reset`)
          .then(() => {
            message.success({
              content: (
                <span>
                  {intl.get('系统将在')}
                  <Countdown
                    className="inline-countdown"
                    format="ss"
                    value={Date.now() + 1000 * 30}
                  />
                  {intl.get('秒后自动刷新')}
                </span>
              ),
              duration: 30,
            });
            disableBody();
            setTimeout(() => {
              window.location.reload();
            }, 30000);
          })
          .catch((error: any) => {
            console.log(error);
          })
          .finally(() => setResetLoading(false));
      },
    });
  };

  return (
    <div style={{ maxWidth: 800, padding: '0 2px' }}>
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={intl.get('备份还原说明')}
        description={
          <Typography style={{ marginTop: 8 }}>
            <Paragraph>
              <Text strong>{intl.get('备份功能')}</Text>
              {intl.get('备份功能说明')}
            </Paragraph>
            <Paragraph>
              <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                <li><Text strong>{intl.get('基础数据')}</Text>{intl.get('基础数据说明')}</li>
                <li><Text strong>{intl.get('配置文件')}</Text>{intl.get('配置文件说明')}</li>
                <li><Text strong>{intl.get('脚本文件')}</Text>{intl.get('脚本文件说明')}</li>
                <li><Text strong>{intl.get('日志文件')}</Text>{intl.get('日志文件说明')}</li>
                <li><Text strong>{intl.get('依赖文件')}</Text>{intl.get('依赖文件说明')}</li>
                <li><Text strong>{intl.get('系统日志')}</Text>{intl.get('系统日志说明')}</li>
                <li><Text strong>{intl.get('依赖缓存')}</Text>{intl.get('依赖缓存说明')}</li>
                <li><Text strong>{intl.get('远程脚本缓存')}</Text>{intl.get('远程脚本缓存说明')}</li>
                <li><Text strong>{intl.get('远程仓库缓存')}</Text>{intl.get('远程仓库缓存说明')}</li>
                <li><Text strong>{intl.get('SSH 文件缓存')}</Text>{intl.get('SSH文件缓存说明')}</li>
              </ul>
            </Paragraph>
            <Paragraph>
              <Text strong>{intl.get('还原功能')}</Text>
              {intl.get('还原功能说明')}
            </Paragraph>
            <Paragraph>
              <Text type="warning">{intl.get('备份注意事项')}</Text>
            </Paragraph>
          </Typography>
        }
        style={{ marginBottom: 24 }}
      />

      <div style={{ display: 'flex', gap: 16 }}>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={() => {
            setSelectedModules(['base', 'config', 'scripts', 'deps']);
            setVisible(true);
          }}
          loading={exportLoading}
          size="large"
        >
          {exportLoading ? intl.get('生成数据中...') : intl.get('备份数据')}
        </Button>

        <Upload
          method="put"
          showUploadList={false}
          maxCount={1}
          action={`${config.apiPrefix}system/data/import`}
          onChange={({ file, event }) => {
            if (event?.percent) {
              showUploadProgress(
                Math.min(parseFloat(event?.percent.toFixed(1)), 99),
              );
            }
            if (file.status === 'done') {
              showUploadProgress(100);
              showReloadModal();
            }
            if (file.status === 'error') {
              message.error('上传失败');
            }
          }}
          name="data"
          headers={{
            Authorization: `Bearer ${localStorage.getItem(config.authKey)}`,
          }}
        >
          <Button icon={<CloudUploadOutlined />} size="large">
            {intl.get('还原数据')}
          </Button>
        </Upload>

        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={resetData}
          loading={resetLoading}
          size="large"
        >
          {intl.get('清空数据')}
        </Button>
      </div>

      <Modal
        title={intl.get('选择备份模块')}
        open={visible}
        onOk={exportData}
        onCancel={() => setVisible(false)}
        okText={intl.get('开始备份')}
        cancelText={intl.get('取消')}
        okButtonProps={{ loading: exportLoading }}
      >
        <Checkbox.Group
          value={selectedModules}
          onChange={(v) => {
            setSelectedModules(v as string[]);
          }}
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 16px',
          }}
        >
          {exportModules.map((module) => (
            <Checkbox
              key={module.value}
              value={module.value}
              disabled={module.disabled}
              style={{ marginLeft: 0 }}
            >
              {module.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
};

export default Backup;
