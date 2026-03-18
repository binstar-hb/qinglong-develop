import EditorToolbar from '@/components/EditorToolbar';
import intl from 'react-intl-universal';
import React, { useRef, useState, useEffect } from 'react';
import { Button, message, Select, Form, Row, Col } from 'antd';
import config from '@/utils/config';

import { request } from '@/utils/http';
import './index.less';
import { DiffEditor } from '@monaco-editor/react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useOutletContext } from '@umijs/max';
import { SharedContext } from '@/layouts';
import { getEditorMode } from '@/utils';

const { Option } = Select;

const Diff = () => {
  const { headerStyle, isPhone, theme, editorTheme, setEditorTheme } =
    useOutletContext<SharedContext>();
  const [origin, setOrigin] = useState('sample/config.sample.sh');
  const [current, setCurrent] = useState('config.sh');
  const [originValue, setOriginValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  const [language, setLanguage] = useState<string>('shell');

  const getConfig = () => {
    request
      .get(`${config.apiPrefix}configs/detail?path=${encodeURIComponent(current)}`)
      .then(({ code, data }) => {
        if (code === 200) {
          setCurrentValue(data);
        }
      });
  };

  const getSample = () => {
    request
      .get(`${config.apiPrefix}configs/detail?path=${encodeURIComponent(origin)}`)
      .then(({ code, data }) => {
        if (code === 200) {
          setOriginValue(data);
        }
      });
  };

  const updateConfig = () => {
    const content = editorRef.current
      ? editorRef.current.getModel().modified.getValue().replace(/\r\n/g, '\n')
      : currentValue;

    request
      .post(`${config.apiPrefix}configs/save`, {
        content,
        name: current,
      })
      .then(({ code, data }) => {
        if (code === 200) {
          message.success(intl.get('保存成功'));
        }
      });
  };

  const getFiles = () => {
    setLoading(true);
    request
      .get(`${config.apiPrefix}configs/sample`)
      .then(({ code, data }) => {
        if (code === 200) {
          setFiles(data);
        }
      })
      .finally(() => setLoading(false));
  };

  const originFileChange = (value: string, op) => {
    setCurrent(op.extra.target);
    setOrigin(value);
    const newMode = getEditorMode(value);
    setLanguage(newMode);
  };

  useEffect(() => {
    getFiles();
  }, []);

  useEffect(() => {
    getSample();
  }, [origin]);

  useEffect(() => {
    getConfig();
  }, [current]);

  return (
    <div className="ql-container-wrapper">
      <div className="ql-page-header" style={headerStyle}>
        <span className="ql-page-header-title">{intl.get('对比工具')}</span>
        <div className="ql-page-header-extra">
          {!isPhone && (
            <Button key="1" type="primary" onClick={updateConfig}>
              {intl.get('保存')}
            </Button>
          )}
        </div>
      </div>
      <Row gutter={24} className="diff-switch-file">
        <Col span={12}>
          <Form.Item label={intl.get('源文件')}>
            <Select value={origin} onChange={originFileChange}>
              {files.map((x) => (
                <Option key={x.value} value={x.value} extra={x}>
                  {x.title}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={intl.get('当前文件')}>
            <span className="ant-form-text">{current}</span>
          </Form.Item>
        </Col>
      </Row>
      {isPhone ? (
        <ReactDiffViewer
          styles={{
            diffContainer: {
              overflowX: 'auto',
              minWidth: 768,
            },
            diffRemoved: {
              overflowX: 'auto',
              maxWidth: 300,
            },
            diffAdded: {
              overflowX: 'auto',
              maxWidth: 300,
            },
            line: {
              wordBreak: 'break-word',
            },
          }}
          oldValue={originValue}
          newValue={currentValue}
          splitView={true}
          leftTitle="config.sh"
          rightTitle="config.sample.sh"
          disableWordDiff={true}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <EditorToolbar
            language={language}
            onLanguageChange={(lang) => setLanguage(lang)}
            theme={editorTheme}
            onThemeChange={setEditorTheme}
          />
          <DiffEditor
            language={language}
            original={originValue}
            modified={currentValue}
            options={{
              fontSize: 12,
              lineNumbersMinChars: 3,
              folding: false,
              glyphMargin: false,
              wordWrap: 'on',
            }}
            theme={editorTheme}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Diff;
