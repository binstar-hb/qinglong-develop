import { EDITOR_LANGUAGES, EDITOR_THEMES } from '@/utils/const';
import { Select } from 'antd';

interface EditorToolbarProps {
  language?: string;
  onLanguageChange?: (lang: string) => void;
  theme: 'vs' | 'vs-dark';
  onThemeChange: (theme: 'vs' | 'vs-dark') => void;
}

const EditorToolbar = ({
  language,
  onLanguageChange,
  theme,
  onThemeChange,
}: EditorToolbarProps) => {
  const isDark = theme === 'vs-dark';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        background: isDark ? '#1e1e1e' : '#f5f5f5',
        borderBottom: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        flexShrink: 0,
      }}
    >
      {onLanguageChange && (
        <Select
          size="small"
          value={language}
          onChange={onLanguageChange}
          options={EDITOR_LANGUAGES}
          style={{ width: 130 }}
          popupMatchSelectWidth={false}
        />
      )}
      <Select
        size="small"
        value={theme}
        onChange={onThemeChange}
        options={EDITOR_THEMES}
        style={{ width: 90 }}
        popupMatchSelectWidth={false}
      />
    </div>
  );
};

export default EditorToolbar;
