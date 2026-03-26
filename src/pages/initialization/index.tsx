import intl from 'react-intl-universal';
import React, { Fragment, useEffect, useState } from 'react';
import {
  Button,
  Row,
  Input,
  Form,
  message,
  Typography,
  Steps,
} from 'antd';
import config from '@/utils/config';
import { history } from '@umijs/max';
import styles from './index.less';
import { request } from '@/utils/http';

const FormItem = Form.Item;
const { Link } = Typography;

const Initialization = () => {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = React.useState(0);

  const next = () => {
    setCurrent(current + 1);
  };

  const prev = () => {
    setCurrent(current - 1);
  };

  const submitAccountSetting = (values: any) => {
    setLoading(true);
    request
      .put(`${config.apiPrefix}user/init`, {
        username: values.username,
        password: values.password,
      })
      .then(({ code, data }) => {
        if (code === 200) {
          next();
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    localStorage.removeItem(config.authKey);
  }, []);

  const steps = [
    {
      title: intl.get('欢迎使用'),
      content: (
        <div className={styles.top} style={{ marginTop: 30 }}>
          <div className={styles.header}>
            <span className={styles.title}>{intl.get('欢迎使用清珑')}</span>
            <span className={styles.desc}>
              {intl.get(
                '支持python3、javascript、shell、typescript 的定时任务管理面板',
              )}
            </span>
          </div>
          <div className={styles.action}>
            <Button
              type="primary"
              onClick={() => {
                next();
              }}
            >
              {intl.get('开始安装')}
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: intl.get('账户设置'),
      content: (
        <Form onFinish={submitAccountSetting} layout="vertical">
          <Form.Item
            label={intl.get('用户名')}
            name="username"
            rules={[{ required: true }]}
            style={{ maxWidth: 350 }}
          >
            <Input placeholder={intl.get('用户名')} />
          </Form.Item>
          <Form.Item
            label={intl.get('密码')}
            name="password"
            rules={[
              { required: true },
              {
                pattern: /^(?!admin$).*$/,
                message: intl.get('密码不能为admin'),
              },
              {
                min: 8,
                message: intl.get('密码长度不能少于8位'),
              },
              {
                pattern: /[a-z]/,
                message: intl.get('密码必须包含小写字母'),
              },
              {
                pattern: /[A-Z]/,
                message: intl.get('密码必须包含大写字母'),
              },
              {
                pattern: /[0-9]/,
                message: intl.get('密码必须包含数字'),
              },
            ]}
            hasFeedback
            style={{ maxWidth: 350 }}
          >
            <Input.Password placeholder={intl.get('密码')} />
          </Form.Item>
          <Form.Item
            name="confirm"
            label={intl.get('确认密码')}
            dependencies={['password']}
            hasFeedback
            style={{ maxWidth: 350 }}
            rules={[
              {
                required: true,
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(intl.get('您输入的两个密码不匹配！')),
                  );
                },
              }),
            ]}
          >
            <Input.Password placeholder={intl.get('确认密码')} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {intl.get('提交')}
          </Button>
        </Form>
      ),
    },
    {
      title: intl.get('完成安装'),
      content: (
        <div className={styles.top} style={{ marginTop: 80 }}>
          <div className={styles.header}>
            <span className={styles.title}>{intl.get('恭喜安装完成！')}</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              onClick={() => {
                window.location.reload();
              }}
            >
              {intl.get('去登录')}
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.header}>
          <img
            alt="logo"
            className={styles.logo}
            src="https://qn.whyour.cn/logo.png"
          />
          <span className={styles.title}>{intl.get('初始化配置')}</span>
        </div>
      </div>
      <div className={styles.main}>
        <Steps
          current={current}
          direction="vertical"
          size="small"
          className={styles['ant-steps']}
          items={steps.map((item) => ({ title: item.title }))}
        />
        <div className={styles['steps-container']}>
          {steps[current].content}
        </div>
      </div>
    </div>
  );
};

export default Initialization;
