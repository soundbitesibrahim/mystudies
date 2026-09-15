/**
 * The priority engine.
 *
 * Fully rule-based and transparent: every point added to a subject's "needs
 * attention" score comes with a sentence the Focus dashboard can show.
 * No AI, no hidden weighting, no guessing at missing data.
 */

import type { PriorityLevel, Subject } from './types';
import type { AssessmentSummary, SubjectHealth, TrendResult } from './scoring';
import { clamp, round } from './utils';

export type ReasonKind =
  | 'standing'
  | 'target'
  | 'trend'
  | 'rating'
  | 'assessment'
  | 'weakness'
  | 'time'
  | 'data'
  | 'positive';

export interface PriorityReason {
  kind: ReasonKind;
  text: string;
  /** Points this rule contributed (negative for positive signals). */
  points: number;
}

export interface PriorityResult {
  subjectId: string;
  level: PriorityLevel;
  /** 0-100 "needs attention" score. Higher means more urgent. */
  score: number;
  reasons: PriorityReason[];
  overridden: boolean;
}

/** Score thresholds. Tuned so a healthy subject never lands in HIGH. */
export const PRIORITY_THRESHOLDS = { high: 48, medium: 20 } as const;

export const PRIORITY_META: Record<
  PriorityLevel,
  { label: string; short: string; icon: string; blurb: string }
> = {
  high: { label: 'High priority', short: 'HIGH', icon: '🔥', blurb: 'Needs significant attention' },
  medium: { label: 'Medium', short: 'MEDIUM', icon: '⚠️', blurb: 'Needs attention' },
  maintain: { label: 'Maintain', short: 'MAINTAIN', icon: '✅', blurb: 'Currently strong' },
};

export const PRIORITY_ORDER: Record<PriorityLevel, number> = { high: 0, medium: 1, maintain: 2 };

export interface PriorityInput {
  subject: Subject;
  health: SubjectHealth;
  trend: TrendResult;
  assessments: AssessmentSummary;
  /** Minutes studied for this subject over the recent window. */
  recentMinutes: number;
  /** Minutes studied across all subjects over the same window. */
  totalRecentMinutes: number;
  /** How many subjects share that window. */
  subjectCount: number;
}

export function computePriority(input: PriorityInput): PriorityResult {
  const { subject, health, trend, assessments } = input;
  const reasons: PriorityReason[] = [];
  let score = 0;

  const add = (kind: ReasonKind, text: string, points: number) => {
    if (points === 0) return;
    score += points;
    reasons.push({ kind, text, points: round(points, 1) });
  };

  const hasAnySignal =
    health.score !== null || subject.weakness.trim() !== '' || assessments.count > 0;

  if (!hasAnySignal) {
    const result: PriorityResult = {
      subjectId: subject.id,
      level: subject.priorityOverride ?? 'medium',
      score: 30,
      reasons: [
        {
          kind: 'data',
          text: 'Not enough information yet — add your personal rating or current performance.',
          points: 30,
        },
      ],
      overridden: subject.priorityOverride !== null,
    };
    return result;
  }

  /* 1 — Overall standing deficit (the largest single factor). */
  if (health.score !== null) {
    add('standing', standingText(health.score), (100 - health.score) * 0.6);
  }

  /* 2 — Distance from the target the user set. */
  if (health.targetGap !== null && health.targetGap > 0) {
    const pts = Math.min(25, health.targetGap * 1.4);
    add(
      'target',
      `${Math.round(health.targetGap)} points below your target (${Math.round(
        health.performancePercent ?? 0,
      )}% now, ${Math.round(health.targetPercent ?? 0)}% wanted).`,
      pts,
    );
  } else if (health.targetGap !== null && health.targetGap <= 0) {
    add('positive', 'You are already at or above your target.', -6);
  }

  /* 3 — Direction of travel. */
  if (trend.direction === 'down') {
    add(
      'trend',
      `Recent results are declining (${formatDelta(trend.delta)} on earlier assessments).`,
      18,
    );
  } else if (trend.direction === 'up') {
    add('positive', `Recent results are improving (${formatDelta(trend.delta)}).`, -8);
  }

  /* 4 — How confident the user feels. */
  if (subject.rating !== null && subject.rating < 60) {
    add(
      'rating',
      `Low personal confidence (you rated yourself ${Math.round(subject.rating)}/100).`,
      Math.min(18, (60 - subject.rating) * 0.4),
    );
  } else if (subject.rating !== null && subject.rating >= 85) {
    add('positive', `You feel strong here (rated ${Math.round(subject.rating)}/100).`, -4);
  }

  /* 5 — The most recent result specifically. */
  if (assessments.latestPercent !== null && assessments.latest) {
    const latest = Math.round(assessments.latestPercent);
    if (latest < 50) {
      add('assessment', `Latest assessment was weak — ${latest}% on "${assessments.latest.name}".`, 10);
    } else if (
      assessments.allTimePercent !== null &&
      assessments.count >= 2 &&
      assessments.latestPercent < assessments.allTimePercent - 10
    ) {
      add(
        'assessment',
        `Latest result (${latest}%) dropped below your average of ${Math.round(
          assessments.allTimePercent,
        )}%.`,
        6,
      );
    }
  }

  /* 6 — A difficulty the user reported themselves. */
  if (subject.weakness.trim() !== '') {
    add('weakness', 'You flagged a specific difficulty in this subject.', 6);
  }

  /* 7 — Study time that does not match the need. Only once there is
        enough logged time for the comparison to mean anything. */
  if (input.totalRecentMinutes >= 120 && input.subjectCount > 1 && score >= 25) {
    const fairShare = input.totalRecentMinutes / input.subjectCount;
    if (input.recentMinutes < fairShare * 0.6) {
      add(
        'time',
        'Getting noticeably less study time than your other subjects.',
        8,
      );
    }
  }

  score = clamp(round(score, 1), 0, 100);

  let level: PriorityLevel =
    score >= PRIORITY_THRESHOLDS.high
      ? 'high'
      : score >= PRIORITY_THRESHOLDS.medium
        ? 'medium'
        : 'maintain';

  /* Safety net: a genuinely strong, non-declining, on-target subject is
     never high priority, whatever the arithmetic says. */
  if (
    level === 'high' &&
    health.score !== null &&
    health.score >= 80 &&
    trend.direction !== 'down' &&
    (health.targetGap === null || health.targetGap <= 0)
  ) {
    level = 'maintain';
  }

  if (level === 'maintain' && reasons.every((r) => r.kind === 'positive')) {
    reasons.unshift({
      kind: 'positive',
      text: 'Strong and steady — keep doing what you are doing.',
      points: 0,
    });
  }

  return {
    subjectId: subject.id,
    level: subject.priorityOverride ?? level,
    score,
    reasons,
    overridden: subject.priorityOverride !== null,
  };
}

function standingText(scoreValue: number): string {
  if (scoreValue < 50) return `Well below a comfortable standing (${Math.round(scoreValue)}/100).`;
  if (scoreValue < 70) return `Below where you want to be (${Math.round(scoreValue)}/100).`;
  if (scoreValue < 85) return `Solid but with room to grow (${Math.round(scoreValue)}/100).`;
  return `Standing is strong (${Math.round(scoreValue)}/100).`;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return 'no change';
  const rounded = round(Math.abs(delta), 1);
  return `${delta >= 0 ? '+' : '−'}${rounded} pts`;
}

/** Ranks subjects by urgency for the Focus dashboard. */
export function rankByPriority(results: PriorityResult[]): PriorityResult[] {
  return [...results].sort((a, b) => {
    const levelDiff = PRIORITY_ORDER[a.level] - PRIORITY_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return b.score - a.score;
  });
}

/** Only the reasons worth showing as "Why?" — positives are shown separately. */
export function concernReasons(result: PriorityResult): PriorityReason[] {
  return result.reasons.filter((r) => r.points > 0);
}

export function positiveReasons(result: PriorityResult): PriorityReason[] {
  return result.reasons.filter((r) => r.points <= 0);
}

