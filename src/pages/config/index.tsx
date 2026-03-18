import EditorToolbar from '@/components/EditorToolbar';
import intl from 'react-intl-universal';
import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Modal, TreeSelect } from 'antd';
import config from '@/utils/config';

import { request } from '@/utils/http';
import Editor from '@monaco-editor/react';
import CodeMirror from '@uiw/react-codemirror';
import { useOutletContext } from '@umijs/max';
import { SharedContext } from '@/layouts';
import { langs } from '@uiw/codemirror-extensions-langs';
import { useHotkeys } from 'react-hotkeys-hook';
import { getEditorMode } from '@/utils';

const Config = () => {
  const { headerStyle, isPhone, theme, editorTheme, setEditorTheme } =
    useOutletContext<SharedContext>();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('config.sh');
  const [select, setSelect] = useState('config.sh');
  const [data, setData] = useState<any[]>([]);
  const editorRef = useRef<any>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [language, setLanguage] = useState<string>('shell');

  const getConfig = (name: string) => {
    request
      .get(`${config.apiPrefix}configs/detail?path=${encodeURIComponent(name)}`)
      .then(({ code, data }) => {
        if (code === 200) {
          setValue(data);
        }
      });
  };

  const getFiles = () => {
    setLoading(true);
    request
      .get(`${config.apiPrefix}configs/files`)
      .then(({ code, data }) => {
        if (code === 200) {
          setData(data);
        }
      })
      .finally(() => setLoading(false));
  };

  const updateConfig = () => {
    setConfirmLoading(true);
    const content = editorRef.current
      ? editorRef.current.getValue().replace(/\r\n/g, '\n')
      : value;

    request
      .post(`${config.apiPrefix}configs/save`, { content, name: select })
      .then(({ code, data }) => {
        if (code === 200) {
          message.success(intl.get('保存成功'));
        }
        setConfirmLoading(false);
      });
  };

  const onSelect = (value: any, node: any) => {
    setSelect(value);
    setTitle(node.value);
    getConfig(node.value);
    const newMode = getEditorMode(value);
    setLanguage(newMode);
  };

  useHotkeys(
    'mod+s',
    (e) => {
      updateConfig();
    },
    { enableOnFormTags: ['textarea'], preventDefault: true },
  );

  useEffect(() => {
    getFiles();
    getConfig('config.sh');
  }, []);

  return (
    <div className="ql-container-wrapper config-wrapper">
      <div className="ql-page-header" style={headerStyle}>
        <span className="ql-page-header-title">{title}</span>
        <div className="ql-page-header-extra">
          <TreeSelect
            treeExpandAction="click"
            className="config-select"
            value={select}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            treeData={data}
            key="value"
            defaultValue="config.sh"
            onSelect={onSelect}
          />
          <Button
            key="1"
            loading={confirmLoading}
            type="primary"
            onClick={updateConfig}
          >
            {intl.get('保存')}
          </Button>
        </div>
      </div>
      {isPhone ? (
        <CodeMirror
          value={value}
          theme={editorTheme === 'vs-dark' ? 'dark' : 'light'}
          extensions={[langs.shell()]}
          onChange={(value) => {
            setValue(value);
          }}
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
          <Editor
            language={language}
            value={value}
            theme={editorTheme}
            options={{
              fontSize: 12,
              lineNumbersMinChars: 3,
              folding: false,
              glyphMargin: false,
              accessibilitySupport: 'off',
            }}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Config;
