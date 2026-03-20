import intl from 'react-intl-universal';
import React, { useState, useEffect } from 'react';
import {
  Button,
  InputNumber,
  Form,
  Radio,
  message,
  Input,
  Select,
} from 'antd';
import * as DarkReader from '@umijs/ssr-darkreader';
import config from '@/utils/config';
import { request } from '@/utils/http';
import CheckUpdate from './checkUpdate';
import { SharedContext } from '@/layouts';
import './index.less';
import pick from 'lodash/pick';
import { TIMEZONES } from '@/utils/const';

const dataMap = {
  'log-remove-frequency': 'logRemoveFrequency',
  'cron-concurrency': 'cronConcurrency',
  timezone: 'timezone',
  'global-ssh-key': 'globalSshKey',
};

const Other = ({
  reloadTheme,
}: Pick<SharedContext, 'reloadTheme'>) => {
  const defaultTheme = localStorage.getItem('qinglong_dark_theme') || 'auto';
  const [systemConfig, setSystemConfig] = useState<{
    logRemoveFrequency?: number | null;
    cronConcurrency?: number | null;
    timezone?: string | null;
    globalSshKey?: string | null;
  }>();
  const [form] = Form.useForm();

  const {
    enable: enableDarkMode,
    disable: disableDarkMode,
    exportGeneratedCSS: collectCSS,
    setFetchMethod,
    auto: followSystemColorScheme,
  } = DarkReader || {};

  const themeChange = (e: any) => {
    const _theme = e.target.value;
    localStorage.setItem('qinglong_dark_theme', e.target.value);
    setFetchMethod(fetch);

    if (_theme === 'dark') {
      enableDarkMode({});
    } else if (_theme === 'light') {
      disableDarkMode();
    } else {
      followSystemColorScheme({});
    }
    reloadTheme();
  };

  const handleLangChange = (v: string) => {
    localStorage.setItem('lang', v);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const getSystemConfig = () => {
    request
      .get(`${config.apiPrefix}system/config`)
      .then(({ code, data }) => {
        if (code === 200) {
          setSystemConfig({
            logRemoveFrequency: 7,
            ...data.info,
          });
        }
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  const updateSystemConfig = (path: keyof typeof dataMap) => {
    request
      .put(
        `${config.apiPrefix}system/config/${path}`,
        pick(systemConfig, dataMap[path]),
      )
      .then(({ code, data }) => {
        if (code === 200) {
          message.success(intl.get('更新成功'));
        }
      })
      .catch((error: any) => {
        console.log(error);
      });
  };

  useEffect(() => {
    getSystemConfig();
  }, []);

  return (
    <>
      <Form layout="vertical" form={form}>
        <Form.Item
          label={intl.get('主题')}
          name="theme"
          initialValue={defaultTheme}
        >
          <Radio.Group
            onChange={themeChange}
            value={defaultTheme}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button
              value="light"
              style={{ width: 70, textAlign: 'center' }}
            >
              {intl.get('亮色')}
            </Radio.Button>
            <Radio.Button
              value="dark"
              style={{ width: 66, textAlign: 'center' }}
            >
              {intl.get('暗色')}
            </Radio.Button>
            <Radio.Button
              value="auto"
              style={{ width: 129, textAlign: 'center' }}
            >
              {intl.get('跟随系统')}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label={intl.get('日志删除频率')}
          name="frequency"
          tooltip={intl.get('每x天自动删除x天以前的日志')}
        >
          <Input.Group compact>
            <InputNumber
              addonBefore={intl.get('每')}
              addonAfter={intl.get('天')}
              style={{ width: 180 }}
              placeholder={intl.get('未启用')}
              min={0}
              value={systemConfig?.logRemoveFrequency}
              onChange={(value) => {
                setSystemConfig({ ...systemConfig, logRemoveFrequency: value });
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                updateSystemConfig('log-remove-frequency');
              }}
              style={{ width: 84 }}
            >
              {intl.get('确认')}
            </Button>
          </Input.Group>
        </Form.Item>
        <Form.Item label={intl.get('定时任务并发数')} name="frequency">
          <Input.Group compact>
            <InputNumber
              style={{ width: 180 }}
              min={4}
              value={systemConfig?.cronConcurrency}
              placeholder={intl.get('默认为 CPU 个数')}
              onChange={(value) => {
                setSystemConfig({ ...systemConfig, cronConcurrency: value });
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                updateSystemConfig('cron-concurrency');
              }}
              style={{ width: 84 }}
            >
              {intl.get('确认')}
            </Button>
          </Input.Group>
        </Form.Item>
        <Form.Item label={intl.get('时区')} name="timezone">
          <Input.Group compact>
            <Select
              value={systemConfig?.timezone}
              style={{ width: 180 }}
              onChange={(value) => {
                setSystemConfig({ ...systemConfig, timezone: value });
              }}
              options={TIMEZONES.map((timezone) => ({
                value: timezone,
                label: timezone,
              }))}
              showSearch
              filterOption={(input, option) =>
                option?.value?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            />
            <Button
              type="primary"
              onClick={() => {
                updateSystemConfig('timezone');
              }}
              style={{ width: 84 }}
            >
              {intl.get('确认')}
            </Button>
          </Input.Group>
        </Form.Item>
        <Form.Item 
          label={intl.get('全局SSH私钥')} 
          name="globalSshKey"
          tooltip={intl.get('用于访问所有私有仓库的全局SSH私钥')}
        >
          <Input.Group compact>
            <Input.TextArea
              value={systemConfig?.globalSshKey || ''}
              style={{ width: 264 }}
              autoSize={{ minRows: 3, maxRows: 8 }}
              placeholder={intl.get('请输入完整的SSH私钥内容')}
              onChange={(e) => {
                setSystemConfig({ ...systemConfig, globalSshKey: e.target.value });
              }}
            />
          </Input.Group>
          <Button
            type="primary"
            onClick={() => {
              updateSystemConfig('global-ssh-key');
            }}
            style={{ width: 264, marginTop: 8 }}
          >
            {intl.get('确认')}
          </Button>
        </Form.Item>
        <Form.Item label={intl.get('语言')} name="lang">
          <Select
            defaultValue={localStorage.getItem('lang') || ''}
            style={{ width: 264 }}
            onChange={handleLangChange}
            options={[
              { value: '', label: intl.get('跟随系统') },
              { value: 'zh', label: '简体中文' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Form.Item>
        <Form.Item label={intl.get('检查更新')} name="update">
          <CheckUpdate />
        </Form.Item>
      </Form>
    </>
  );
};

export default Other;
