/** Exam countdowns and how ready you are for them. */

import type { Exam, Topic } from './types';
import type { TopicMastery } from './mastery';
import { daysUntil, fromISODate, isValidISODate, mean, round } from './utils';

export interface ExamInfo {
  examId: string;
  /** Negative once the exam has passed. null when the date is unusable. */
  daysAway: number | null;
  past: boolean;
  label: string;
  /** Topics the exam covers that are not yet strong. */
  remaining: number;
  covered: number;
  /** Mean mastery across covered topics, or null when nothing is linked. */
  readiness: number | null;
}

export function examInfo(
  exam: Exam,
  topics: Topic[],
  masteryById: Map<string, TopicMastery>,
): ExamInfo {
  const valid = isValidISODate(exam.date);
  const daysAway = valid ? daysUntil(exam.date) : null;

  const linked = exam.topicIds.length
    ? topics.filter((t) => exam.topicIds.includes(t.id))
    : topics.filter((t) => t.subjectId === exam.subjectId);

  const masteries = linked
    .map((t) => masteryById.get(t.id)?.value)
    .filter((n): n is number => n !== undefined);
  const remaining = linked.filter((t) => {
    const m = masteryById.get(t.id);
    return !m || m.value < 75;
  }).length;

  return {
    examId: exam.id,
    daysAway,
    past: daysAway !== null && daysAway < 0,
    label:
      daysAway === null
        ? 'No date'
        : daysAway === 0
          ? 'Today'
          : daysAway > 0
            ? `${daysAway} ${daysAway === 1 ? 'day' : 'days'}`
            : `${Math.abs(daysAway)} ${Math.abs(daysAway) === 1 ? 'day' : 'days'} ago`,
    remaining,
    covered: linked.length,
    readiness: masteries.length ? round(mean(masteries) as number, 0) : null,
  };
}

export function sortExams(exams: Exam[]): Exam[] {
  return [...exams].sort((a, b) => {
    const av = isValidISODate(a.date) ? fromISODate(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const bv = isValidISODate(b.date) ? fromISODate(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return av - bv;
  });
}
