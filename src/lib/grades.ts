/** Letter-grade <-> percentage conversion. Both systems are first class. */

import type { Grade } from './types';
import { clamp } from './utils';

export const GRADES: Grade[] = ['A*', 'A', 'B', 'C', 'D', 'E', 'F'];

interface Band {
  grade: Grade;
  min: number;
  max: number;
}

/** Standard UK-style boundaries. */
export const GRADE_BANDS: Band[] = [
  { grade: 'A*', min: 90, max: 100 },
  { grade: 'A', min: 80, max: 89 },
  { grade: 'B', min: 70, max: 79 },
  { grade: 'C', min: 60, max: 69 },
  { grade: 'D', min: 50, max: 59 },
  { grade: 'E', min: 40, max: 49 },
  { grade: 'F', min: 0, max: 39 },
];

export function isGrade(value: unknown): value is Grade {
  return typeof value === 'string' && (GRADES as string[]).includes(value);
}

export function gradeFromPercent(percent: number): Grade {
  const p = clamp(percent, 0, 100);
  const band = GRADE_BANDS.find((b) => p >= b.min);
  return band ? band.grade : 'F';
}

/**
 * A representative percentage for a letter grade — the middle of its band.
 * Used only when no explicit percentage was entered.
 */
export function percentFromGrade(grade: Grade): number {
  const band = GRADE_BANDS.find((b) => b.grade === grade);
  if (!band) return 0;
  return Math.round((band.min + band.max) / 2);
}

/** 0 = A*, 6 = F. Lower is better. */
export function gradeIndex(grade: Grade): number {
  return GRADES.indexOf(grade);
}

/** "84%  ·  A" style label from whatever the user actually recorded. */
export function describePerformance(percent: number | null, grade: Grade | null): string {
  if (percent !== null && grade !== null) return `${Math.round(percent)}% · ${grade}`;
  if (percent !== null) return `${Math.round(percent)}% · ${gradeFromPercent(percent)}`;
  if (grade !== null) return grade;
  return '—';
}
