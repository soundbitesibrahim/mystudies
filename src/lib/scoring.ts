/**
 * Academic standing calculations.
 *
 * Rule: missing information is never treated as zero. Every score renormalises
 * over the signals that actually exist, and returns null when nothing exists.
 */

import type { Assessment, Subject, Trend } from './types';
import { percentFromGrade } from './grades';
import { clamp, fromISODate, mean, round } from './utils';

/** How much each available signal counts towards a subject's standing. */
export const SIGNAL_WEIGHTS = {
  rating: 0.3,
  performance: 0.35,
  assessments: 0.35,
} as const;

export interface AssessmentSummary {
  /** Recency-weighted average percentage of recent assessments, or null. */
  recentPercent: number | null;
  /** Plain average of every assessment, or null. */
  allTimePercent: number | null;
  latest: Assessment | null;
  latestPercent: number | null;
  count: number;
}

export interface SubjectHealth {
  /** 0-100 overall standing, or null when there is no information at all. */
  score: number | null;
  /** Which signals contributed, for transparency in the UI. */
  used: { rating: boolean; performance: boolean; assessments: boolean };
  /** Effective current performance percentage from any available source. */
  performancePercent: number | null;
  targetPercent: number | null;
  /** target − current, positive means below target. null when unknown. */
  targetGap: number | null;
}

export function assessmentPercent(a: Assessment): number {
  if (!a.maxScore) return 0;
  return clamp((a.score / a.maxScore) * 100, 0, 1000);
}

export function sortAssessments(list: Assessment[]): Assessment[] {
  return [...list].sort((a, b) => {
    const diff = fromISODate(a.date).getTime() - fromISODate(b.date).getTime();
    if (diff !== 0) return diff;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Summarises a subject's assessments, most-recent-weighted. */
export function summariseAssessments(list: Assessment[]): AssessmentSummary {
  const sorted = sortAssessments(list);
  if (!sorted.length) {
    return {
      recentPercent: null,
      allTimePercent: null,
      latest: null,
      latestPercent: null,
      count: 0,
    };
  }

  const percents = sorted.map(assessmentPercent);
  const recent = [...sorted].reverse().slice(0, 5);
  let weighted = 0;
  let weightTotal = 0;
  recent.forEach((a, i) => {
    const w = 0.8 ** i; // newest counts most
    weighted += assessmentPercent(a) * w;
    weightTotal += w;
  });

  const latest = sorted[sorted.length - 1];
  return {
    recentPercent: weightTotal ? weighted / weightTotal : null,
    allTimePercent: mean(percents),
    latest,
    latestPercent: assessmentPercent(latest),
    count: sorted.length,
  };
}

/** Current performance from an explicit percentage, else from a letter grade. */
export function currentPerformancePercent(subject: Subject): number | null {
  if (subject.currentPercent !== null) return subject.currentPercent;
  if (subject.currentGrade !== null) return percentFromGrade(subject.currentGrade);
  return null;
}

export function targetPerformancePercent(subject: Subject): number | null {
  if (subject.targetPercent !== null) return subject.targetPercent;
  if (subject.targetGrade !== null) return percentFromGrade(subject.targetGrade);
  return null;
}

/**
 * Blends the signals that exist into a single 0-100 standing.
 * Weights are renormalised so an absent signal neither helps nor hurts.
 */
export function subjectHealth(subject: Subject, assessments: Assessment[]): SubjectHealth {
  const summary = summariseAssessments(assessments);
  const performance = currentPerformancePercent(subject);
  const target = targetPerformancePercent(subject);

  const parts: Array<[number, number]> = [];
  if (subject.rating !== null) parts.push([clamp(subject.rating, 0, 100), SIGNAL_WEIGHTS.rating]);
  if (performance !== null) parts.push([clamp(performance, 0, 100), SIGNAL_WEIGHTS.performance]);
  if (summary.recentPercent !== null)
    parts.push([clamp(summary.recentPercent, 0, 100), SIGNAL_WEIGHTS.assessments]);

  const weightTotal = parts.reduce((acc, [, w]) => acc + w, 0);
  const score =
    weightTotal > 0
      ? round(parts.reduce((acc, [v, w]) => acc + v * w, 0) / weightTotal, 0)
      : null;

  /** Best available read on "where I am now" — assessments refine it. */
  const effective =
    performance !== null && summary.recentPercent !== null
      ? performance * 0.5 + summary.recentPercent * 0.5
      : performance ?? summary.recentPercent;

  return {
    score,
    used: {
      rating: subject.rating !== null,
      performance: performance !== null,
      assessments: summary.recentPercent !== null,
    },
    performancePercent: effective === null ? null : round(effective, 0),
    targetPercent: target,
    targetGap: effective === null || target === null ? null : round(target - effective, 0),
  };
}

export interface TrendResult {
  direction: Trend | null;
  /** Percentage-point change between older and recent results. */
  delta: number | null;
  /** Why the trend is unknown, when it is. */
  note: string;
}

const TREND_THRESHOLD = 3;

/** Compares recent assessments against earlier ones. Needs 2+ results. */
export function subjectTrend(assessments: Assessment[]): TrendResult {
  const sorted = sortAssessments(assessments);
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
  const direction: Trend = delta > TREND_THRESHOLD ? 'up' : delta < -TREND_THRESHOLD ? 'down' : 'flat';
  return { direction, delta, note: '' };
}

export interface OverallStatus {
  score: number | null;
  label: string;
  trend: Trend | null;
  trendDelta: number | null;
  /** Number of subjects that contributed a score. */
  scored: number;
  total: number;
}

export function statusLabel(score: number | null): string {
  if (score === null) return 'No data yet';
  if (score >= 88) return 'Excellent';
  if (score >= 78) return 'Strong';
  if (score >= 66) return 'Good';
  if (score >= 52) return 'Fair';
  if (score >= 40) return 'Struggling';
  return 'Critical';
}

/** Overall standing = mean of the subjects that have any information. */
export function overallStatus(
  subjects: Subject[],
  healths: Map<string, SubjectHealth>,
  trends: Map<string, TrendResult>,
): OverallStatus {
  const scores = subjects
    .map((s) => healths.get(s.id)?.score ?? null)
    .filter((n): n is number => n !== null);
  const deltas = subjects
    .map((s) => trends.get(s.id)?.delta ?? null)
    .filter((n): n is number => n !== null);

  const score = scores.length ? round(mean(scores) as number, 0) : null;
  const trendDelta = deltas.length ? round(mean(deltas) as number, 1) : null;
  const trend: Trend | null =
    trendDelta === null ? null : trendDelta > TREND_THRESHOLD ? 'up' : trendDelta < -TREND_THRESHOLD ? 'down' : 'flat';

  return {
    score,
    label: statusLabel(score),
    trend,
    trendDelta,
    scored: scores.length,
    total: subjects.length,
  };
}

export const TREND_LABEL: Record<Trend, string> = {
  up: 'Improving',
  flat: 'Stable',
  down: 'Declining',
};

export const TREND_ARROW: Record<Trend, string> = {
  up: '↑',
  flat: '→',
  down: '↓',
};
