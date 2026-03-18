import { Button, Modal, Statistic, message } from 'antd';
import intl from 'react-intl-universal';
import config from '@/utils/config';
import { request } from '@/utils/http';
import { disableBody } from '@/utils';

const { Countdown } = Statistic;

const CheckUpdate = () => {
  const handleClick = () => {
    Modal.info({
      title: intl.get('检查更新'),
      content: intl.get('欢迎提出宝贵意见，请联系管理员'),
      okText: intl.get('知道了'),
      centered: true,
    });
  };

  const reloadSystem = () => {
    request
      .put(`${config.apiPrefix}update/reload`)
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
  };

  return (
    <>
      <Button type="primary" onClick={handleClick}>
        {intl.get('检查更新')}
      </Button>
      <Button
        type="primary"
        onClick={reloadSystem}
        style={{ marginLeft: 8 }}
      >
        {intl.get('重新启动')}
      </Button>
    </>
  );
};

export default CheckUpdate;
