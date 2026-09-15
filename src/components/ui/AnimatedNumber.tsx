/** Counts from the previous value to the new one on every change. */

import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../state/theme';

interface AnimatedNumberProps {
  value: number | null;
  duration?: number;
  decimals?: number;
  /** Rendered when value is null. */
  placeholder?: string;
  format?: (n: number) => string;
  className?: string;
}

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  placeholder = '—',
  format,
  className = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value ?? 0);
  const fromRef = useRef(value ?? 0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (value === null) return;
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (to - from) * easeOutExpo(t);
      setDisplay(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  if (value === null) return <span className={`num ${className}`.trim()}>{placeholder}</span>;

  const rounded = Number(display.toFixed(decimals));
  return (
    <span className={`num ${className}`.trim()}>
      {format ? format(rounded) : rounded.toFixed(decimals)}
    </span>
  );
}

/** Same idea, but for durations rendered as "14h 32m". */
export function AnimatedDuration({
  minutes,
  className = '',
  duration = 900,
}: {
  minutes: number;
  className?: string;
  duration?: number;
}) {
  return (
    <AnimatedNumber
      value={minutes}
      duration={duration}
      className={className}
      format={(n) => {
        const total = Math.max(0, Math.round(n));
        const h = Math.floor(total / 60);
        const m = total % 60;
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
      }}
    />
  );
}
