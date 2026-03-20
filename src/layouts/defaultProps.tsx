import intl from 'react-intl-universal';
import {
  SettingOutlined,
  ClockCircleOutlined,
  CloudDownloadOutlined,
  SafetyOutlined,
  FileTextOutlined,
  CodeOutlined,
  AppstoreOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

export const menuItems: MenuItem[] = [
  {
    key: '/crontab',
    icon: <ClockCircleOutlined />,
    label: intl.get('定时任务'),
  },
  {
    key: '/subscription',
    icon: <CloudDownloadOutlined />,
    label: intl.get('订阅管理'),
  },
  {
    key: '/env',
    icon: <SafetyOutlined />,
    label: intl.get('环境变量'),
  },
  {
    key: '/config',
    icon: <FileTextOutlined />,
    label: intl.get('配置文件'),
  },
  {
    key: '/script',
    icon: <CodeOutlined />,
    label: intl.get('脚本管理'),
  },
  {
    key: '/dependence',
    icon: <AppstoreOutlined />,
    label: intl.get('依赖管理'),
  },
  {
    key: '/log',
    icon: <ReadOutlined />,
    label: intl.get('日志管理'),
  },
{
    key: '/setting',
    icon: <SettingOutlined />,
    label: intl.get('系统设置'),
  },
];

export const siderWidth = 180;
export const siderCollapsedWidth = 48;
