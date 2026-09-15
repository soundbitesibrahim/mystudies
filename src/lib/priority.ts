/**
 * Subject priority.
 *
 * Every point added carries the sentence that explains it, so no priority is
 * ever shown without a reason the user can read. Rule-based throughout — there
 * is no model here, and the UI should never imply otherwise.
 */

import type { PriorityLevel, Subject } from './types';
import type { PerformanceResult, TrendResult } from './performance';
import { clamp, round } from './utils';

export type ReasonKind =
  | 'target'
  | 'performance'
  | 'mastery'
  | 'coverage'
  | 'trend'
  | 'confidence'
  | 'weakness'
  | 'exam'
  | 'revision'
  | 'time'
  | 'data'
  | 'positive';

export interface PriorityReason {
  kind: ReasonKind;
  text: string;
  points: number;
}

export interface PriorityResult {
  subjectId: string;
  level: PriorityLevel;
  score: number;
  reasons: PriorityReason[];
  overridden: boolean;
  /** One line suitable for a table cell or badge tooltip. */
  headline: string;
}

export const PRIORITY_THRESHOLDS = { high: 48, medium: 20 } as const;

export const PRIORITY_META: Record<PriorityLevel, { label: string; short: string; blurb: string }> = {
  high: { label: 'High', short: 'HIGH', blurb: 'Needs significant attention' },
  medium: { label: 'Medium', short: 'MEDIUM', blurb: 'Needs attention' },
  maintain: { label: 'Maintain', short: 'MAINTAIN', blurb: 'Currently strong' },
};

export const PRIORITY_ORDER: Record<PriorityLevel, number> = { high: 0, medium: 1, maintain: 2 };

export interface PriorityInput {
  subject: Subject;
  performance: PerformanceResult;
  trend: TrendResult;
  /** Best available current percentage. */
  currentPercent: number | null;
  targetPercent: number | null;
  /** Mean topic mastery, 0-100. null when the subject has no topics. */
  mastery: number | null;
  /** Syllabus coverage, 0-1. null when the subject has no topics. */
  coverage: number | null;
  /** Mean coverage across every subject, for a relative comparison. */
  averageCoverage: number | null;
  weakTopics: number;
  overdueRevisions: number;
  /** Days until this subject's next exam, or null. */
  daysToExam: number | null;
  examHorizonDays: number;
  /** Minutes studied recently for this subject and across all subjects. */
  recentMinutes: number;
  totalRecentMinutes: number;
  subjectCount: number;
}

export function computePriority(input: PriorityInput): PriorityResult {
  const { subject } = input;
  const reasons: PriorityReason[] = [];
  let score = 0;

  const add = (kind: ReasonKind, text: string, points: number) => {
    if (points === 0) return;
    score += points;
    reasons.push({ kind, text, points: round(points, 1) });
  };

  const hasAnySignal =
    input.currentPercent !== null ||
    input.mastery !== null ||
    input.performance.count > 0 ||
    subject.weakness.trim() !== '';

  if (!hasAnySignal) {
    return {
      subjectId: subject.id,
      level: subject.priorityOverride ?? 'medium',
      score: 30,
      reasons: [
        {
          kind: 'data',
          text: 'Not enough information yet — record a result or set topic mastery.',
          points: 30,
        },
      ],
      overridden: subject.priorityOverride !== null,
      headline: 'Not enough information yet.',
    };
  }

  /* 1 — Distance from the target the user set. */
  const gap =
    input.currentPercent !== null && input.targetPercent !== null
      ? round(input.targetPercent - input.currentPercent, 0)
      : null;
  if (gap !== null && gap > 0) {
    add(
      'target',
      `${gap} points below target (${Math.round(input.currentPercent as number)}% now, ${Math.round(
        input.targetPercent as number,
      )}% wanted).`,
      Math.min(26, gap * 1.4),
    );
  } else if (gap !== null) {
    add('positive', 'At or above your target.', -6);
  }

  /* 2 — Where performance actually sits. */
  if (input.currentPercent !== null && input.currentPercent < 70) {
    add(
      'performance',
      `Performance is ${Math.round(input.currentPercent)}%, below a comfortable A/A* range.`,
      (70 - input.currentPercent) * 0.45,
    );
  }

  /* 3 — Topic mastery across the syllabus. */
  if (input.mastery !== null && input.mastery < 70) {
    add('mastery', `Average topic mastery is only ${Math.round(input.mastery)}%.`, (70 - input.mastery) * 0.35);
  }

  /* 4 — Syllabus coverage, judged against your other subjects rather than
        against 100%. Early in the year everything is uncovered; that is not a
        problem, but falling behind the others is. */
  if (
    input.coverage !== null &&
    input.averageCoverage !== null &&
    input.coverage < input.averageCoverage - 0.12
  ) {
    add(
      'coverage',
      `Syllabus coverage (${Math.round(input.coverage * 100)}%) is behind your other subjects (${Math.round(
        input.averageCoverage * 100,
      )}% on average).`,
      Math.min(14, (input.averageCoverage - input.coverage) * 40),
    );
  }

  /* 5 — Direction of travel. */
  if (input.trend.direction === 'down') {
    add('trend', `Results are declining (${formatDelta(input.trend.delta)}).`, 16);
  } else if (input.trend.direction === 'up') {
    add('positive', `Results are improving (${formatDelta(input.trend.delta)}).`, -8);
  }

  /* 6 — Specific weak topics. */
  if (input.weakTopics > 0) {
    add(
      'weakness',
      `${input.weakTopics} weak ${input.weakTopics === 1 ? 'topic' : 'topics'} flagged by mastery or results.`,
      Math.min(14, input.weakTopics * 3),
    );
  }

  /* 7 — Review debt. */
  if (input.overdueRevisions > 0) {
    add(
      'revision',
      `${input.overdueRevisions} ${input.overdueRevisions === 1 ? 'topic is' : 'topics are'} overdue for revision.`,
      Math.min(12, input.overdueRevisions * 3),
    );
  }

  /* 8 — An exam getting close. */
  if (input.daysToExam !== null && input.daysToExam >= 0 && input.daysToExam <= input.examHorizonDays) {
    const closeness = 1 - input.daysToExam / Math.max(1, input.examHorizonDays);
    add(
      'exam',
      `Exam in ${input.daysToExam} ${input.daysToExam === 1 ? 'day' : 'days'}.`,
      round(6 + closeness * 14, 1),
    );
  }

  /* 9 — How the user feels about it. */
  if (subject.rating !== null && subject.rating < 60) {
    add('confidence', `Low personal confidence (${Math.round(subject.rating)}/100).`, Math.min(14, (60 - subject.rating) * 0.35));
  } else if (subject.rating !== null && subject.rating >= 85) {
    add('positive', `You feel strong here (${Math.round(subject.rating)}/100).`, -4);
  }

  /* 10 — Study time that does not match the need. */
  if (input.totalRecentMinutes >= 120 && input.subjectCount > 1 && score >= 25) {
    const fairShare = input.totalRecentMinutes / input.subjectCount;
    if (input.recentMinutes < fairShare * 0.6) {
      add('time', 'Getting noticeably less study time than your other subjects.', 8);
    }
  }

  score = clamp(round(score, 1), 0, 100);

  let level: PriorityLevel =
    score >= PRIORITY_THRESHOLDS.high
      ? 'high'
      : score >= PRIORITY_THRESHOLDS.medium
        ? 'medium'
        : 'maintain';

  // A strong, on-target, non-declining subject is never high priority.
  if (
    level === 'high' &&
    input.currentPercent !== null &&
    input.currentPercent >= 82 &&
    input.trend.direction !== 'down' &&
    (gap === null || gap <= 0)
  ) {
    level = 'maintain';
  }

  const concerns = reasons.filter((r) => r.points > 0).sort((a, b) => b.points - a.points);
  const headline = concerns[0]?.text ?? reasons[0]?.text ?? 'No concerns flagged.';

  return {
    subjectId: subject.id,
    level: subject.priorityOverride ?? level,
    score,
    reasons,
    overridden: subject.priorityOverride !== null,
    headline,
  };
}

function formatDelta(delta: number | null): string {
  if (delta === null) return 'no change';
  return `${delta >= 0 ? '+' : '−'}${round(Math.abs(delta), 1)} pts`;
}

export function rankByPriority<T extends { priority: PriorityResult }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = PRIORITY_ORDER[a.priority.level] - PRIORITY_ORDER[b.priority.level];
    return diff !== 0 ? diff : b.priority.score - a.priority.score;
  });
}

export function concernReasons(result: PriorityResult): PriorityReason[] {
  return result.reasons.filter((r) => r.points > 0).sort((a, b) => b.points - a.points);
}

export function positiveReasons(result: PriorityResult): PriorityReason[] {
  return result.reasons.filter((r) => r.points <= 0);
}
