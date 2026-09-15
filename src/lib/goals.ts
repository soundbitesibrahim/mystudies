/** Goal progress: where you are now against what you said you wanted. */

import type { Goal, GradeThreshold } from './types';
import { gradeFromPercent, percentForGrade } from './grades';
import { clamp, daysUntil, formatMinutes, isValidISODate, round } from './utils';

export type GoalStatus = 'achieved' | 'close' | 'behind' | 'no-data';

export interface GoalProgress {
  goalId: string;
  target: number | null;
  current: number | null;
  gap: number | null;
  progress: number;
  status: GoalStatus;
  statusLabel: string;
  currentLabel: string;
  targetLabel: string;
  daysLeft: number | null;
  overdue: boolean;
  unit: 'percent' | 'minutes';
}

export interface GoalContext {
  /** Effective performance percentage for the goal's scope. */
  performance: number | null;
  /** Syllabus coverage 0-100 for the goal's scope. */
  syllabus: number | null;
  /** Minutes studied this week for the goal's scope. */
  weekMinutes: number;
  /** Readiness for a linked exam, 0-100. */
  examReadiness: number | null;
  thresholds: GradeThreshold[];
}

export function goalTargetValue(goal: Goal, thresholds: GradeThreshold[]): number | null {
  switch (goal.kind) {
    case 'grade':
      return goal.targetGrade ? percentForGrade(goal.targetGrade, thresholds) : null;
    case 'percent':
    case 'syllabus':
      return goal.targetPercent;
    case 'study-time':
      return goal.targetMinutes;
    case 'exam':
      return goal.targetGrade
        ? percentForGrade(goal.targetGrade, thresholds)
        : goal.targetPercent;
    default:
      return null;
  }
}

export function goalTargetLabel(goal: Goal, thresholds: GradeThreshold[]): string {
  if (goal.kind === 'grade' || (goal.kind === 'exam' && goal.targetGrade)) {
    return goal.targetGrade ?? '—';
  }
  if (goal.kind === 'study-time') return formatMinutes(goal.targetMinutes ?? 0) + '/week';
  const value = goalTargetValue(goal, thresholds);
  return value === null ? '—' : `${round(value, 0)}%`;
}

export function goalKindLabel(kind: Goal['kind']): string {
  switch (kind) {
    case 'grade':
      return 'Grade';
    case 'percent':
      return 'Performance';
    case 'syllabus':
      return 'Syllabus coverage';
    case 'study-time':
      return 'Study time';
    case 'exam':
      return 'Exam result';
    default:
      return 'Goal';
  }
}

function currentValue(goal: Goal, ctx: GoalContext): number | null {
  switch (goal.kind) {
    case 'grade':
    case 'percent':
      return ctx.performance;
    case 'syllabus':
      return ctx.syllabus;
    case 'study-time':
      return ctx.weekMinutes;
    case 'exam':
      return ctx.examReadiness ?? ctx.performance;
    default:
      return null;
  }
}

export function computeGoalProgress(goal: Goal, ctx: GoalContext): GoalProgress {
  const target = goalTargetValue(goal, ctx.thresholds);
  const current = currentValue(goal, ctx);
  const unit: GoalProgress['unit'] = goal.kind === 'study-time' ? 'minutes' : 'percent';

  const daysLeft = isValidISODate(goal.deadline) ? daysUntil(goal.deadline) : null;
  const gap = target === null || current === null ? null : round(target - current, 0);

  let status: GoalStatus = 'no-data';
  if (gap !== null) {
    if (gap <= 0) status = 'achieved';
    else if (unit === 'minutes' ? gap <= (target ?? 0) * 0.15 : gap <= 15) status = 'close';
    else status = 'behind';
  }

  const overdue = daysLeft !== null && daysLeft < 0 && status !== 'achieved';
  const progress = target && current !== null ? clamp(current / target, 0, 1) : status === 'achieved' ? 1 : 0;

  const fmt = (v: number | null) =>
    v === null ? '—' : unit === 'minutes' ? formatMinutes(v) : `${round(v, 0)}%`;

  return {
    goalId: goal.id,
    target,
    current,
    gap,
    progress,
    status,
    statusLabel: describeStatus(status, gap, overdue, unit),
    currentLabel:
      current === null
        ? 'Not enough data'
        : goal.kind === 'grade'
          ? `${gradeFromPercent(current, ctx.thresholds)} (${round(current, 0)}%)`
          : fmt(current),
    targetLabel: goalTargetLabel(goal, ctx.thresholds),
    daysLeft,
    overdue,
    unit,
  };
}

function describeStatus(
  status: GoalStatus,
  gap: number | null,
  overdue: boolean,
  unit: 'percent' | 'minutes',
): string {
  if (status === 'no-data' || gap === null) return 'Not enough data';
  if (status === 'achieved') return 'Achieved';
  const amount = unit === 'minutes' ? formatMinutes(gap) : `${gap} points`;
  if (overdue) return `Overdue · ${amount} short`;
  if (status === 'close') return `Nearly there · ${amount} to go`;
  return `${amount} to go`;
}
