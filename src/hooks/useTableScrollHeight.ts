import { RefObject, useEffect, useState } from 'react';
import { getTableScroll } from '@/utils';

export default <T extends HTMLElement>(
  target: RefObject<T>,
  extraHeight?: number,
) => {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let _target = entry.target as any;
        if (!_target.classList.contains('ant-table-wrapper')) {
          _target = entry.target.querySelector('.ant-table-wrapper');
        }
        setHeight(getTableScroll({ extraHeight, target: _target as HTMLElement }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [target.current, extraHeight]);

  return height;
};
