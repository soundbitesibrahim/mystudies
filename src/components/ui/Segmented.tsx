/** Segmented control with a sliding thumb. */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const container = ref.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!active) return;
    setThumb({ left: active.offsetLeft, width: active.offsetWidth, ready: true });
  };

  useLayoutEffect(measure, [value, options.length]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div className="segmented" role="group" aria-label={ariaLabel} ref={ref}>
      <span
        className="segmented__thumb"
        style={{
          transform: `translateX(${thumb.left - 3}px)`,
          width: thumb.width,
          opacity: thumb.ready ? 1 : 0,
        }}
        aria-hidden="true"
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="segmented__btn"
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
