/**
 * Performance from assessment evidence.
 *
 * Nothing here invents a score. Where there is not enough evidence the result
 * is null and the UI says "Not enough data yet" rather than showing a number.
 */

import type { Assessment, Subject, Trend } from './types';
import { clamp, fromISODate, mean, round } from './utils';

/** Below this many results, a subject percentage is reported as provisional. */
export const CONFIDENT_RESULT_COUNT = 3;

export function assessmentPercent(a: Assessment): number {
  if (!a.maxScore) return 0;
  return clamp((a.score / a.maxScore) * 100, 0, 100);
}

export function sortByDate<T extends { date: string; createdAt: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const diff = fromISODate(a.date).getTime() - fromISODate(b.date).getTime();
    return diff !== 0 ? diff : a.createdAt.localeCompare(b.createdAt);
  });
}

export interface PerformanceResult {
  /** Recency-weighted percentage, or null when there is no evidence. */
  percent: number | null;
  /** Plain average of everything recorded. */
  average: number | null;
  latest: Assessment | null;
  latestPercent: number | null;
  count: number;
  /** False when there is evidence but too little to lean on. */
  confident: boolean;
  /** Explains a null or provisional result. */
  note: string;
}

export function subjectPerformance(assessments: Assessment[]): PerformanceResult {
  const sorted = sortByDate(assessments);
  if (!sorted.length) {
    return {
      percent: null,
      average: null,
      latest: null,
      latestPercent: null,
      count: 0,
      confident: false,
      note: 'Not enough data yet — no assessments recorded.',
    };
  }

  const percents = sorted.map(assessmentPercent);
  const recent = [...sorted].reverse().slice(0, 5);
  let weighted = 0;
  let weightTotal = 0;
  recent.forEach((a, i) => {
    const w = 0.8 ** i;
    weighted += assessmentPercent(a) * w;
    weightTotal += w;
  });

  const latest = sorted[sorted.length - 1];
  const count = sorted.length;
  return {
    percent: round(weighted / weightTotal, 0),
    average: round(mean(percents) as number, 0),
    latest,
    latestPercent: round(assessmentPercent(latest), 0),
    count,
    confident: count >= CONFIDENT_RESULT_COUNT,
    note:
      count >= CONFIDENT_RESULT_COUNT
        ? ''
        : `Provisional — based on ${count} ${count === 1 ? 'result' : 'results'}.`,
  };
}

/**
 * The percentage to judge a subject by: assessment evidence when it exists,
 * otherwise whatever the user recorded by hand.
 */
export function effectivePercent(subject: Subject, performance: PerformanceResult): number | null {
  if (performance.percent !== null && performance.confident) return performance.percent;
  if (performance.percent !== null && subject.currentPercent !== null) {
    return round((performance.percent + subject.currentPercent) / 2, 0);
  }
  if (performance.percent !== null) return performance.percent;
  return subject.currentPercent;
}

export interface TrendResult {
  direction: Trend | null;
  delta: number | null;
  note: string;
}

const TREND_THRESHOLD = 3;

export function performanceTrend(assessments: Assessment[]): TrendResult {
  const sorted = sortByDate(assessments);
  if (sorted.length < 2) {
    return {
      direction: null,
      delta: null,
      note: sorted.length === 1 ? 'One result so far' : 'No assessments yet',
    };
  }

  const percents = sorted.map(assessmentPercent);
  const recentCount = Math.min(3, Math.ceil(percents.length / 2));
  const recent = percents.slice(-recentCount);
  const older = percents.slice(0, percents.length - recentCount).slice(-4);
  const olderAvg = mean(older.length ? older : percents.slice(0, 1));
  const recentAvg = mean(recent);
  if (olderAvg === null || recentAvg === null) {
    return { direction: null, delta: null, note: 'Not enough results' };
  }

  const delta = round(recentAvg - olderAvg, 1);
  const direction: Trend =
    delta > TREND_THRESHOLD ? 'up' : delta < -TREND_THRESHOLD ? 'down' : 'flat';
  return { direction, delta, note: '' };
}

export const TREND_LABEL: Record<Trend, string> = {
  up: 'Improving',
  flat: 'Stable',
  down: 'Declining',
};

export const TREND_ARROW: Record<Trend, string> = { up: '↑', flat: '→', down: '↓' };
