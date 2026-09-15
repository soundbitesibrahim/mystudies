/** Study-time aggregation. Totals only — deliberately not a timetable. */

import type { StudyLog, Subject } from './types';
import { addDays, fromISODate, startOfWeek, sum, toISODate } from './utils';

export interface WeekTotals {
  thisWeek: number;
  lastWeek: number;
  change: number;
  thisWeekStart: string;
  lastWeekStart: string;
}

function minutesBetween(logs: StudyLog[], startISO: string, endISOExclusive: string): number {
  return sum(
    logs
      .filter((l) => l.date >= startISO && l.date < endISOExclusive)
      .map((l) => l.minutes),
  );
}

export function weekTotals(logs: StudyLog[], weekStartsOn: 'mon' | 'sun'): WeekTotals {
  const thisStart = startOfWeek(new Date(), weekStartsOn);
  const lastStart = addDays(thisStart, -7);
  const nextStart = addDays(thisStart, 7);

  const thisWeek = minutesBetween(logs, toISODate(thisStart), toISODate(nextStart));
  const lastWeek = minutesBetween(logs, toISODate(lastStart), toISODate(thisStart));

  return {
    thisWeek,
    lastWeek,
    change: thisWeek - lastWeek,
    thisWeekStart: toISODate(thisStart),
    lastWeekStart: toISODate(lastStart),
  };
}

export interface SubjectMinutes {
  subjectId: string;
  minutes: number;
  /** 0-1 share of the period total. */
  share: number;
}

/** Minutes per subject over the last `days` days (inclusive of today). */
export function minutesBySubject(
  logs: StudyLog[],
  subjects: Subject[],
  days: number,
): { rows: SubjectMinutes[]; total: number } {
  const from = toISODate(addDays(new Date(), -(days - 1)));
  const scoped = logs.filter((l) => l.date >= from);
  const total = sum(scoped.map((l) => l.minutes));

  const rows = subjects
    .map((s) => {
      const minutes = sum(scoped.filter((l) => l.subjectId === s.id).map((l) => l.minutes));
      return { subjectId: s.id, minutes, share: total ? minutes / total : 0 };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return { rows, total };
}

/** Minutes per subject within the current week. */
export function minutesBySubjectThisWeek(
  logs: StudyLog[],
  subjects: Subject[],
  weekStartsOn: 'mon' | 'sun',
): { rows: SubjectMinutes[]; total: number } {
  const start = toISODate(startOfWeek(new Date(), weekStartsOn));
  const end = toISODate(addDays(startOfWeek(new Date(), weekStartsOn), 7));
  const scoped = logs.filter((l) => l.date >= start && l.date < end);
  const total = sum(scoped.map((l) => l.minutes));
  const rows = subjects
    .map((s) => {
      const minutes = sum(scoped.filter((l) => l.subjectId === s.id).map((l) => l.minutes));
      return { subjectId: s.id, minutes, share: total ? minutes / total : 0 };
    })
    .sort((a, b) => b.minutes - a.minutes);
  return { rows, total };
}

export function totalMinutes(logs: StudyLog[]): number {
  return sum(logs.map((l) => l.minutes));
}

export function sortLogsByDateDesc(logs: StudyLog[]): StudyLog[] {
  return [...logs].sort((a, b) => {
    const diff = fromISODate(b.date).getTime() - fromISODate(a.date).getTime();
    if (diff !== 0) return diff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
