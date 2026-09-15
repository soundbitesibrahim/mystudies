/** Letter grades with configurable percentage thresholds. */

import type { Grade, GradeThreshold } from './types';
import { clamp } from './utils';

export const GRADES: Grade[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'F'];

export const DEFAULT_THRESHOLDS: GradeThreshold[] = [
  { grade: 'A*', min: 90 },
  { grade: 'A', min: 80 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 60 },
  { grade: 'D', min: 50 },
  { grade: 'E', min: 40 },
  { grade: 'F', min: 0 },
];

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'string' && (GRADES as string[]).includes(value);
}

/** Thresholds sorted highest first, so the first match wins. */
export function sortThresholds(thresholds: GradeThreshold[]): GradeThreshold[] {
  return [...thresholds].sort((a, b) => b.min - a.min);
}

export function gradeFromPercent(percent: number, thresholds = DEFAULT_THRESHOLDS): Grade {
  const p = clamp(percent, 0, 100);
  const band = sortThresholds(thresholds).find((b) => p >= b.min);
  return band ? band.grade : 'F';
}

/** The percentage a grade starts at — what you need to reach it. */
export function percentForGrade(grade: Grade, thresholds = DEFAULT_THRESHOLDS): number {
  return sortThresholds(thresholds).find((b) => b.grade === grade)?.min ?? 0;
}

/** A representative percentage for a grade — the middle of its band. */
export function percentFromGrade(grade: Grade, thresholds = DEFAULT_THRESHOLDS): number {
  const sorted = sortThresholds(thresholds);
  const index = sorted.findIndex((b) => b.grade === grade);
  if (index === -1) return 0;
  const min = sorted[index].min;
  const max = index === 0 ? 100 : sorted[index - 1].min - 1;
  return Math.round((min + max) / 2);
}

/** 0 = A*, 6 = F. Lower is better. */
export function gradeIndex(grade: Grade): number {
  return GRADES.indexOf(grade);
}

export function describePerformance(
  percent: number | null,
  thresholds = DEFAULT_THRESHOLDS,
): string {
  if (percent === null) return '—';
  return `${Math.round(percent)}% · ${gradeFromPercent(percent, thresholds)}`;
}
