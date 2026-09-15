/** Global search across everything the user has recorded. */

import type { Assessment, Chapter, Exam, Goal, Subject, Topic } from './types';
import { matches } from './utils';

export type SearchKind = 'subject' | 'chapter' | 'topic' | 'assessment' | 'goal' | 'exam';

export interface SearchHit {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  /** Lower sorts first. */
  rank: number;
}

const KIND_LABEL: Record<SearchKind, string> = {
  subject: 'Subject',
  chapter: 'Chapter',
  topic: 'Topic',
  assessment: 'Assessment',
  goal: 'Goal',
  exam: 'Exam',
};

export const searchKindLabel = (kind: SearchKind): string => KIND_LABEL[kind];

export interface SearchSource {
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  assessments: Assessment[];
  goals: Goal[];
  exams: Exam[];
  subjectName: (id: string) => string;
  goalLabel: (goal: Goal) => string;
}

/** Exact prefix beats a word start, which beats a loose substring. */
function rankFor(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  return 3;
}

export function search(source: SearchSource, rawQuery: string, limit = 30): SearchHit[] {
  const query = rawQuery.trim();
  if (query.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const subject of source.subjects) {
    if (matches(subject.name, query) || (subject.code && matches(subject.code, query))) {
      hits.push({
        id: subject.id,
        kind: 'subject',
        title: subject.name,
        subtitle: subject.code || 'Subject',
        rank: rankFor(subject.name, query),
      });
    }
  }

  for (const chapter of source.chapters) {
    if (matches(chapter.name, query) || (chapter.code && matches(chapter.code, query))) {
      hits.push({
        id: chapter.id,
        kind: 'chapter',
        title: chapter.name,
        subtitle: `${source.subjectName(chapter.subjectId)}${chapter.code ? ` · ${chapter.code}` : ''}`,
        rank: rankFor(chapter.name, query) + 0.1,
      });
    }
  }

  for (const topic of source.topics) {
    if (matches(topic.name, query) || (topic.code && matches(topic.code, query))) {
      hits.push({
        id: topic.id,
        kind: 'topic',
        title: topic.name,
        subtitle: `${source.subjectName(topic.subjectId)}${topic.code ? ` · ${topic.code}` : ''}`,
        rank: rankFor(topic.name, query),
      });
    }
  }

  for (const assessment of source.assessments) {
    if (matches(assessment.name, query)) {
      hits.push({
        id: assessment.id,
        kind: 'assessment',
        title: assessment.name,
        subtitle: `${source.subjectName(assessment.subjectId)} · ${assessment.date}`,
        rank: rankFor(assessment.name, query) + 0.2,
      });
    }
  }

  for (const exam of source.exams) {
    if (matches(exam.name, query)) {
      hits.push({
        id: exam.id,
        kind: 'exam',
        title: exam.name,
        subtitle: `${source.subjectName(exam.subjectId)} · ${exam.date}`,
        rank: rankFor(exam.name, query) + 0.2,
      });
    }
  }

  for (const goal of source.goals) {
    const label = source.goalLabel(goal);
    if (matches(label, query) || matches(goal.note, query)) {
      hits.push({
        id: goal.id,
        kind: 'goal',
        title: label,
        subtitle: goal.note || 'Goal',
        rank: rankFor(label, query) + 0.3,
      });
    }
  }

  return hits.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title)).slice(0, limit);
}
