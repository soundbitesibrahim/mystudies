/** Priority badges, trend arrows, meters and other small read-outs. */

import React, { useEffect, useRef, useState } from 'react';
import type { PriorityLevel, Trend } from '../../lib/types';
import { PRIORITY_META } from '../../lib/priority';
import { TREND_ARROW, TREND_LABEL } from '../../lib/scoring';

export function PriorityBadge({ level, compact = false }: { level: PriorityLevel; compact?: boolean }) {
  const meta = PRIORITY_META[level];
  const [pulse, setPulse] = useState(false);
  const previous = useRef(level);

  // One calm pulse when a subject moves between priority levels.
  useEffect(() => {
    if (previous.current === level) return;
    previous.current = level;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 950);
    return () => window.clearTimeout(t);
  }, [level]);

  return (
    <span
      className={`badge badge--${level}${pulse ? ' priority-changed' : ''}`}
      style={{
        ['--pulse-color' as string]:
          level === 'high' ? 'var(--bad-soft)' : level === 'medium' ? 'var(--warn-soft)' : 'var(--good-soft)',
      }}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {compact ? meta.short : meta.label}
    </span>
  );
}

export function TrendIndicator({
  direction,
  delta,
  note,
  showLabel = true,
}: {
  direction: Trend | null;
  delta?: number | null;
  note?: string;
  showLabel?: boolean;
}) {
  if (!direction) {
    return (
      <span className="trend faint" title={note || 'Not enough assessments yet'}>
        <span className="trend__arrow" aria-hidden="true">
          –
        </span>
        {showLabel && <span>{note || 'No trend yet'}</span>}
      </span>
    );
  }

  const tone = direction === 'up' ? 'tone-good' : direction === 'down' ? 'tone-bad' : 'muted';
  const deltaText =
    delta !== null && delta !== undefined && direction !== 'flat'
      ? ` ${delta > 0 ? '+' : '−'}${Math.abs(delta)} pts`
      : '';

  return (
    <span className={`trend ${tone}`} title={`${TREND_LABEL[direction]}${deltaText}`}>
      <span className="trend__arrow" aria-hidden="true">
        {TREND_ARROW[direction]}
      </span>
      {showLabel && <span>{TREND_LABEL[direction]}</span>}
      <span className="sr-only">{TREND_LABEL[direction]}</span>
    </span>
  );
}

export function Meter({
  value,
  max = 100,
  tone,
  label,
}: {
  value: number;
  max?: number;
  tone?: 'good' | 'warn' | 'bad' | 'accent';
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const toneClass = tone && tone !== 'accent' ? ` meter__fill--${tone}` : '';
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`meter__fill${toneClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Colour tone for a 0-100 standing. */
export function scoreTone(score: number | null): 'good' | 'warn' | 'bad' | undefined {
  if (score === null) return undefined;
  if (score >= 75) return 'good';
  if (score >= 55) return 'warn';
  return 'bad';
}

export function toneClass(score: number | null): string {
  const tone = scoreTone(score);
  return tone ? `tone-${tone}` : 'faint';
}
