import DynamicBackground from '@/components/DynamicBackground';

import config from '@/utils/config';
import { useCtx, useTheme } from '@/utils/hooks';
import { request } from '@/utils/http';
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { StyleProvider } from '@ant-design/cssinjs';
import { history, Outlet, useLocation } from '@umijs/max';
import * as DarkReader from '@umijs/ssr-darkreader';
import { Avatar, Badge, ConfigProvider, Dropdown, Image, Menu, MenuProps, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import intl from 'react-intl-universal';
import vhCheck from 'vh-check';
import { menuItems, siderWidth, siderCollapsedWidth } from './defaultProps';
import './index.less';
import { init } from '../utils/init';
import WebSocketManager from '../utils/websocket';
import NewPageLoading from '../loading';

export interface SharedContext {
  headerStyle: React.CSSProperties;
  isPhone: boolean;
  theme: 'vs' | 'vs-dark';
  editorTheme: 'vs' | 'vs-dark';
  setEditorTheme: (theme: 'vs' | 'vs-dark') => void;
  user: any;
  reloadUser: (needLoading?: boolean) => void;
  reloadTheme: () => void;
  systemInfo: TSystemInfo;
}

interface TSystemInfo {
  branch: 'develop' | 'master';
  isInitialized: boolean;
  publishTime: number;
  version: string;
  changeLog: string;
  changeLogLink: string;
}

export default function () {
  const location = useLocation();
  const ctx = useCtx();
  const { theme, editorTheme, setEditorTheme, reloadTheme } = useTheme();
  const [user, setUser] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [systemInfo, setSystemInfo] = useState<TSystemInfo>();
  const [collapsed, setCollapsed] = useState(false);
  const [initLoading, setInitLoading] = useState<boolean>(true);
  const {
    enable: enableDarkMode,
    disable: disableDarkMode,
    exportGeneratedCSS: collectCSS,
    setFetchMethod,
    auto: followSystemColorScheme,
  } = DarkReader || {};

  const logout = () => {
    request.post(`${config.apiPrefix}user/logout`).then(() => {
      localStorage.removeItem(config.authKey);
      history.push('/login');
    });
  };

  const getSystemInfo = () => {
    request
      .get(`${config.apiPrefix}system`)
      .then(({ code, data }) => {
        if (code === 200) {
          setSystemInfo(data);
          if (!data.isInitialized) {
            history.push('/initialization');
          } else {
            init(data.version);
            getUser();
          }
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getUser = (needLoading = true) => {
    needLoading && setLoading(true);
    request
      .get(`${config.apiPrefix}user`)
      .then(({ code, data }) => {
        if (code === 200 && data.username) {
          setUser(data);
          if (location.pathname === '/') {
            history.push('/crontab');
          }
        }
        needLoading && setLoading(false);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const getHealthStatus = () => {
    request
      .get(`${config.apiPrefix}health`)
      .then((res) => {
        if (res?.data?.status === 'ok') {
          getSystemInfo();
        } else {
          history.push('/error');
        }
      })
      .catch((error) => {
        const responseStatus = error.response.status;
        if (responseStatus !== 401) {
          history.push('/error');
        } else {
          window.location.reload();
        }
      })
      .finally(() => setInitLoading(false));
  };

  const reloadUser = (needLoading = false) => {
    getUser(needLoading);
  };

  useEffect(() => {
    if (systemInfo && systemInfo.isInitialized && !user) {
      getUser();
    }
  }, [location.pathname]);

  useEffect(() => {
    getHealthStatus();
  }, []);

  useEffect(() => {
    if (theme === 'vs-dark') {
      document.body.setAttribute('data-dark', 'true');
    } else {
      document.body.setAttribute('data-dark', 'false');
    }
  }, [theme]);

  useEffect(() => {
    vhCheck();

    const _theme = localStorage.getItem('qinglong_dark_theme') || 'auto';
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia === 'undefined') return;
    if (!DarkReader) {
      return () => null;
    }
    setFetchMethod(fetch);

    if (_theme === 'dark') {
      enableDarkMode({});
    } else if (_theme === 'light') {
      disableDarkMode();
    } else {
      followSystemColorScheme({});
    }

    return () => {
      disableDarkMode();
    };
  }, []);

  useEffect(() => {
    if (!user || !user.username) return;
    const ws = WebSocketManager.getInstance(
      `${window.location.origin}${
        config.apiPrefix
      }ws?token=${localStorage.getItem(config.authKey)}`,
    );

    return () => {
      ws.close();
    };
  }, [user]);

  useEffect(() => {
    // 设置页面标题
    const title =
      (config.documentTitleMap as any)[location.pathname] ||
      intl.get('未找到');
    document.title = `${title} - ${intl.get('清珑')}`;
  }, [location.pathname]);

  useEffect(() => {
    window.onload = () => {
      const timing = performance.timing;
      console.log(`白屏时间: ${timing.responseStart - timing.navigationStart}`);
      console.log(
        `请求完毕至DOM加载: ${timing.domInteractive - timing.responseEnd}`,
      );
      console.log(
        `解释dom树耗时: ${timing.domComplete - timing.domInteractive}`,
      );
      console.log(
        `从开始至load总耗时: ${timing.loadEventEnd - timing.navigationStart}`,
      );
    };
  }, []);

  if (initLoading) {
    return <NewPageLoading />;
  }

  if (['/login', '/initialization', '/error'].includes(location.pathname)) {
    if (systemInfo?.isInitialized && location.pathname === '/initialization') {
      history.push('/crontab');
    }

    if (systemInfo || location.pathname === '/error') {
      return (
        <>
          <DynamicBackground />
          <Outlet
            context={{
              ...ctx,
              theme,
              editorTheme,
              setEditorTheme,
              user,
              reloadUser,
              reloadTheme,
            }}
          />
        </>
      );
    }
  }

  const isFirefox = navigator.userAgent.includes('Firefox');
  const isSafari =
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome');
  const isQQBrowser = navigator.userAgent.includes('QQBrowser');

  const userMenu: MenuProps = {
    items: [
      {
        label: intl.get('退出登录'),
        className: 'side-menu-user-drop-menu',
        onClick: logout,
        key: 'logout',
        icon: <LogoutOutlined />,
      },
    ],
  };

  const onMenuClick = ({ key }: { key: string }) => {
    if (location.pathname !== key) {
      history.push(key);
    }
  };

  return loading ? (
    <NewPageLoading />
  ) : (
    <>
      <DynamicBackground />

      <StyleProvider hashPriority="low">
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#6366f1',
              fontFamily: "'HarmonyOS Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              borderRadius: 6,
            },
          }}
        >
          <div className="ql-layout">
            {/* 侧边栏 */}
            <div
              className={`ql-sider ${collapsed ? 'ql-sider-collapsed' : ''}`}
              style={{ width: collapsed ? siderCollapsedWidth : siderWidth }}
            >
              {/* Logo */}
              <div className="ql-sider-logo">
                <Image preview={false} src="https://qn.whyour.cn/logo.png" />
                {!collapsed && (
                  <div className="title">
                    <span className="title">{intl.get('清珑')}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(systemInfo?.changeLogLink, '_blank');
                      }}
                    >
                      <Tooltip
                        title={
                          systemInfo?.branch === 'develop'
                            ? intl.get('开发版')
                            : intl.get('正式版')
                        }
                      >
                        <Badge size="small" dot={systemInfo?.branch === 'develop'}>
                          <span
                            style={{
                              fontSize: isFirefox ? 9 : 12,
                              color: '#666',
                              marginLeft: 2,
                              zoom: isSafari ? 0.66 : 0.8,
                              letterSpacing: isQQBrowser ? -2 : 0,
                            }}
                          >
                            v{systemInfo?.version}
                          </span>
                        </Badge>
                      </Tooltip>
                    </span>
                  </div>
                )}
              </div>

              {/* 菜单 */}
              <div className="ql-sider-menu">
                <Menu
                  mode="inline"
                  selectedKeys={[location.pathname]}
                  items={menuItems}
                  inlineCollapsed={collapsed}
                  onClick={onMenuClick}
                />
              </div>

              {/* 底部：用户 + 折叠按钮 */}
              <div className="ql-sider-footer">
                <span
                  className="side-menu-container"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {!collapsed && !ctx.isPhone && (
                    <Dropdown menu={userMenu} placement="topLeft" trigger={['hover']}>
                      <span className="side-menu-user-wrapper">
                        <Avatar
                          shape="square"
                          size="small"
                          icon={<UserOutlined />}
                          src={
                            user.avatar
                              ? `${config.apiPrefix}static/${user.avatar}`
                              : ''
                          }
                        />
                        <span style={{ marginLeft: 5 }}>{user.username}</span>
                      </span>
                    </Dropdown>
                  )}
                  <span
                    className="side-menu-collapse-button"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  </span>
                </span>
              </div>
            </div>

            {/* 手机端顶栏 */}
            {ctx.isPhone && (
              <div className="ql-mobile-header">
                <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                  <span className="side-menu-user-wrapper">
                    <Avatar
                      shape="square"
                      size="small"
                      icon={<UserOutlined />}
                      src={
                        user.avatar ? `${config.apiPrefix}static/${user.avatar}` : ''
                      }
                    />
                    <span style={{ marginLeft: 5 }}>{user.username}</span>
                  </span>
                </Dropdown>
              </div>
            )}

            {/* 主内容区 */}
            <div className="ql-content">
              <Outlet
                context={{
                  ...ctx,
                  theme,
                  editorTheme,
                  setEditorTheme,
                  user,
                  reloadUser,
                  reloadTheme,
                  systemInfo,
                }}
              />
            </div>
          </div>
        </ConfigProvider>
      </StyleProvider>
    </>
  );
}
