/** Study-time aggregation and balance. Totals only — not a timetable. */

import type { StudySession, Subject } from './types';
import { addDays, fromISODate, startOfWeek, sum, toISODate } from './utils';

export interface PeriodTotals {
  thisWeek: number;
  lastWeek: number;
  change: number;
  thisMonth: number;
  last30: number;
  previous30: number;
  thisWeekStart: string;
  lastWeekStart: string;
}

function minutesBetween(sessions: StudySession[], startISO: string, endExclusive: string): number {
  return sum(sessions.filter((s) => s.date >= startISO && s.date < endExclusive).map((s) => s.minutes));
}

export function periodTotals(sessions: StudySession[], weekStartsOn: 'mon' | 'sun'): PeriodTotals {
  const now = new Date();
  const thisStart = startOfWeek(now, weekStartsOn);
  const lastStart = addDays(thisStart, -7);
  const nextStart = addDays(thisStart, 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const thisWeek = minutesBetween(sessions, toISODate(thisStart), toISODate(nextStart));
  const lastWeek = minutesBetween(sessions, toISODate(lastStart), toISODate(thisStart));

  const last30Start = toISODate(addDays(now, -29));
  const prev30Start = toISODate(addDays(now, -59));

  return {
    thisWeek,
    lastWeek,
    change: thisWeek - lastWeek,
    thisMonth: minutesBetween(sessions, toISODate(monthStart), toISODate(monthEnd)),
    last30: minutesBetween(sessions, last30Start, toISODate(addDays(now, 1))),
    previous30: minutesBetween(sessions, prev30Start, last30Start),
    thisWeekStart: toISODate(thisStart),
    lastWeekStart: toISODate(lastStart),
  };
}

export interface SubjectMinutes {
  subjectId: string;
  minutes: number;
  share: number;
}

function distribute(
  sessions: StudySession[],
  subjects: Subject[],
): { rows: SubjectMinutes[]; total: number } {
  const total = sum(sessions.map((s) => s.minutes));
  const rows = subjects
    .map((subject) => {
      const minutes = sum(sessions.filter((s) => s.subjectId === subject.id).map((s) => s.minutes));
      return { subjectId: subject.id, minutes, share: total ? minutes / total : 0 };
    })
    .sort((a, b) => b.minutes - a.minutes);
  return { rows, total };
}

export function minutesBySubject(
  sessions: StudySession[],
  subjects: Subject[],
  days: number,
): { rows: SubjectMinutes[]; total: number } {
  const from = toISODate(addDays(new Date(), -(days - 1)));
  return distribute(sessions.filter((s) => s.date >= from), subjects);
}

export function minutesBySubjectThisWeek(
  sessions: StudySession[],
  subjects: Subject[],
  weekStartsOn: 'mon' | 'sun',
): { rows: SubjectMinutes[]; total: number } {
  const start = startOfWeek(new Date(), weekStartsOn);
  const startISO = toISODate(start);
  const endISO = toISODate(addDays(start, 7));
  return distribute(
    sessions.filter((s) => s.date >= startISO && s.date < endISO),
    subjects,
  );
}

/** Minutes logged per day over the last `days` days, oldest first. */
export function dailyMinutes(sessions: StudySession[], days: number): Array<{ date: string; minutes: number }> {
  const out: Array<{ date: string; minutes: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toISODate(addDays(new Date(), -i));
    out.push({ date, minutes: sum(sessions.filter((s) => s.date === date).map((s) => s.minutes)) });
  }
  return out;
}

export function totalMinutes(sessions: StudySession[]): number {
  return sum(sessions.map((s) => s.minutes));
}

export function sortSessionsByDateDesc(sessions: StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) => {
    const diff = fromISODate(b.date).getTime() - fromISODate(a.date).getTime();
    return diff !== 0 ? diff : b.createdAt.localeCompare(a.createdAt);
  });
}
