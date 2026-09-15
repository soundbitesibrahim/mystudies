/** Status read-outs: dots, badges, trends, meters. Colour only where it means something. */

import React from 'react';
import type { MasteryState, PriorityLevel, Trend } from '../../lib/types';
import { PRIORITY_META } from '../../lib/priority';
import { MASTERY_META } from '../../lib/mastery';
import { TREND_ARROW, TREND_LABEL } from '../../lib/performance';

export type Tone = 'risk' | 'attention' | 'good' | 'none';

/** Tone for a 0-100 figure where higher is better. */
export function scoreTone(value: number | null): Tone {
  if (value === null) return 'none';
  if (value >= 75) return 'good';
  if (value >= 55) return 'attention';
  return 'risk';
}

export function toneClass(value: number | null): string {
  const tone = scoreTone(value);
  return tone === 'none' ? 'faint' : `tone-${tone}`;
}

const PRIORITY_TONE: Record<PriorityLevel, Tone> = {
  high: 'risk',
  medium: 'attention',
  maintain: 'good',
};

export function StatusDot({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className={`status-dot status-dot--${tone}`} role={label ? 'img' : undefined} aria-label={label} />
  );
}

export function PriorityBadge({ level, compact = false }: { level: PriorityLevel; compact?: boolean }) {
  const meta = PRIORITY_META[level];
  const tone = PRIORITY_TONE[level];
  return (
    <span className={`badge badge--${tone}`} title={meta.blurb}>
      {compact ? meta.short : meta.label}
    </span>
  );
}

/** Compact priority for dense tables: a dot plus a word. */
export function PriorityMark({ level }: { level: PriorityLevel }) {
  return (
    <span className="row" style={{ gap: 7 }}>
      <StatusDot tone={PRIORITY_TONE[level]} />
      <span style={{ fontSize: '0.813rem' }}>{PRIORITY_META[level].label}</span>
    </span>
  );
}

export function MasteryBadge({ state }: { state: MasteryState }) {
  const meta = MASTERY_META[state];
  const tone: Tone =
    meta.tone === 'good' ? 'good' : meta.tone === 'mid' ? 'attention' : meta.tone === 'weak' ? 'risk' : 'none';
  return <span className={`badge${tone === 'none' ? '' : ` badge--${tone}`}`}>{meta.label}</span>;
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
        {showLabel && <span>{note || 'No trend'}</span>}
      </span>
    );
  }

  const tone = direction === 'up' ? 'tone-good' : direction === 'down' ? 'tone-risk' : 'muted';
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
  tall = false,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  label?: string;
  tall?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const toneClassName = tone && tone !== 'none' ? ` meter__fill--${tone}` : '';
  return (
    <div
      className={`meter${tall ? ' meter--tall' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`meter__fill${toneClassName}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A minimal line chart — only used where a shape genuinely reads better than numbers. */
export function Sparkline({
  values,
  label,
  height = 36,
}: {
  values: number[];
  label: string;
  height?: number;
}) {
  if (values.length < 2) return null;
  const width = 160;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pad = 3;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <path d={path} fill="none" stroke="var(--text-faint)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="var(--text)" />
    </svg>
  );
}
