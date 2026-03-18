import { RefObject, useEffect, useState } from 'react';

export default <T extends HTMLElement>(target: RefObject<T>) => {
  const [height, setHeight] = useState<number>(0);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeight(entry.target.clientHeight);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [target.current]);

  return height;
};
