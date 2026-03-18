import { useState, useEffect, useMemo } from 'react';
import browserType from './index';

export type EditorThemeType = 'vs' | 'vs-dark';

export const useCtx = () => {
  const [width, setWidth] = useState('100%');
  const [marginLeft, setMarginLeft] = useState(0);
  const [isPhone, setIsPhone] = useState(false);
  const [isMedium, setIsMedium] = useState(false);
  const { platform } = useMemo(() => browserType(), []);

  useEffect(() => {
    const w = document.body.offsetWidth;
    if (platform === 'mobile' && w < 768) {
      setWidth('auto');
      setMarginLeft(0);
      setIsPhone(true);
      setIsMedium(false);
      document.body.setAttribute('data-mode', 'phone');
    } else if (w >= 768 && w < 1024) {
      setWidth('100%');
      setMarginLeft(0);
      setIsPhone(false);
      setIsMedium(true);
      document.body.setAttribute('data-mode', 'tablet');
    } else {
      setWidth('100%');
      setMarginLeft(0);
      setIsPhone(false);
      setIsMedium(false);
      document.body.setAttribute('data-mode', 'desktop');
    }
  }, []);

  return {
    headerStyle: {
      padding: '4px 24px 4px 15px',
      position: 'relative' as const,
      zIndex: 20,
      width,
      marginLeft,
    } as any,
    isPhone,
    isMedium,
  };
};

export const useTheme = () => {
  // 页面暗色模式（跟随系统）
  const [theme, setTheme] = useState<EditorThemeType>('vs');

  // 编辑器主题（用户手动切换，默认深色，持久化到 localStorage）
  const [editorTheme, setEditorThemeState] = useState<EditorThemeType>(() => {
    return (
      (localStorage.getItem('qinglong_editor_theme') as EditorThemeType) ||
      'vs-dark'
    );
  });

  const setEditorTheme = (t: EditorThemeType) => {
    setEditorThemeState(t);
    localStorage.setItem('qinglong_editor_theme', t);
  };

  const reloadTheme = () => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const storageTheme = localStorage.getItem('qinglong_dark_theme');
    const isDark =
      (media.matches && storageTheme !== 'light') || storageTheme === 'dark';
    setTheme(isDark ? 'vs-dark' : 'vs');
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const storageTheme = localStorage.getItem('qinglong_dark_theme');
    const isDark =
      (media.matches && storageTheme !== 'light') || storageTheme === 'dark';
    setTheme(isDark ? 'vs-dark' : 'vs');

    const cb = (e: any) => {
      if (storageTheme === 'auto' || !storageTheme) {
        if (e.matches) {
          setTheme('vs-dark');
        } else {
          setTheme('vs');
        }
      }
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', cb);
    } else if (typeof media.addListener === 'function') {
      media.addListener(cb);
    }
  }, []);

  return { theme, editorTheme, setEditorTheme, reloadTheme };
};
