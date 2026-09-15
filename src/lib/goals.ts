/** Goal progress: where you are now vs. where you said you want to be. */

import type { Goal, Subject } from './types';
import type { SubjectHealth } from './scoring';
import { gradeFromPercent, percentFromGrade } from './grades';
import { clamp, daysUntil, isValidISODate, mean, round } from './utils';

export type GoalStatus = 'achieved' | 'close' | 'behind' | 'no-data';

export interface GoalProgress {
  goalId: string;
  targetPercent: number | null;
  currentPercent: number | null;
  /** target − current, positive means there is still a gap. */
  gap: number | null;
  /** 0-1, for the progress bar. */
  progress: number;
  status: GoalStatus;
  statusLabel: string;
  daysLeft: number | null;
  overdue: boolean;
  label: string;
}

export function goalTargetPercent(goal: Goal): number | null {
  if (goal.targetType === 'percent') return goal.targetPercent;
  return goal.targetGrade ? percentFromGrade(goal.targetGrade) : null;
}

export function goalTargetLabel(goal: Goal): string {
  if (goal.targetType === 'grade' && goal.targetGrade) return goal.targetGrade;
  if (goal.targetPercent !== null) return `${round(goal.targetPercent, 0)}%`;
  return '—';
}

export function computeGoalProgress(
  goal: Goal,
  subjects: Subject[],
  healths: Map<string, SubjectHealth>,
): GoalProgress {
  const target = goalTargetPercent(goal);

  let current: number | null = null;
  if (goal.scope === 'subject' && goal.subjectId) {
    current = healths.get(goal.subjectId)?.performancePercent ?? null;
  } else {
    const values = subjects
      .map((s) => healths.get(s.id)?.performancePercent ?? null)
      .filter((n): n is number => n !== null);
    current = values.length ? round(mean(values) as number, 0) : null;
  }

  const daysLeft = isValidISODate(goal.deadline) ? daysUntil(goal.deadline) : null;
  const gap = target === null || current === null ? null : round(target - current, 0);

  // Red is reserved for a genuinely large shortfall — a modest gap is amber.
  let status: GoalStatus = 'no-data';
  if (gap !== null) {
    if (gap <= 0) status = 'achieved';
    else if (gap <= 15) status = 'close';
    else status = 'behind';
  }

  const overdue = daysLeft !== null && daysLeft < 0 && status !== 'achieved';
  const progress =
    target && current !== null ? clamp(current / target, 0, 1) : status === 'achieved' ? 1 : 0;

  return {
    goalId: goal.id,
    targetPercent: target,
    currentPercent: current,
    gap,
    progress,
    status,
    statusLabel: describeStatus(status, gap, overdue),
    daysLeft,
    overdue,
    label:
      goal.targetType === 'grade' && current !== null
        ? `${gradeFromPercent(current)} now`
        : current !== null
          ? `${current}% now`
          : 'No data yet',
  };
}

function describeStatus(status: GoalStatus, gap: number | null, overdue: boolean): string {
  if (status === 'no-data' || gap === null) return 'Not enough data';
  if (status === 'achieved') return 'Achieved';
  if (overdue) return `Overdue · ${gap} points short`;
  if (gap <= 5) return `Nearly there · ${gap} to go`;
  return `${gap} points to go`;
}
