/**
 * The focus engine: what to study next, and why.
 *
 * It scores every topic against the signals the user has actually recorded,
 * ranks them, and attaches the reasons that produced the score. It only ever
 * proposes — the plan is the user's to change, and nothing here writes to it.
 */

import type { Settings, Topic } from './types';
import type { TopicMastery } from './mastery';
import type { RevisionInfo } from './revision';
import { clamp, daysSince, round } from './utils';

export interface FocusReason {
  text: string;
  points: number;
}

export interface Recommendation {
  topicId: string;
  subjectId: string;
  score: number;
  /** Suggested length in minutes. */
  minutes: number;
  reasons: FocusReason[];
  /** The single strongest reason, for compact rows. */
  headline: string;
}

export interface FocusInput {
  topic: Topic;
  mastery: TopicMastery;
  revision: RevisionInfo;
  /** Subject-level shortfall against target, positive means behind. */
  subjectGap: number | null;
  /** Subject priority score, 0-100. */
  subjectPriority: number;
  /** Days until an exam covering this topic, or null. */
  daysToExam: number | null;
  /** Mean percentage this topic scored in assessments, or null. */
  assessedPercent: number | null;
  settings: Settings;
}

/** Longer sessions for weaker, heavier topics. */
function suggestMinutes(input: FocusInput): number {
  const base = input.settings.defaultSessionMinutes || 30;
  let minutes = base;
  if (input.mastery.value < 40) minutes = base + 10;
  else if (input.mastery.value >= 75) minutes = Math.max(15, base - 10);
  if (input.topic.difficulty >= 3) minutes += 5;
  // Round to the nearest 5 so the plan reads cleanly.
  return clamp(Math.round(minutes / 5) * 5, 10, 90);
}

export function scoreTopic(input: FocusInput): Recommendation | null {
  const { topic, mastery, revision, settings } = input;

  if (topic.state === 'not-started' && !settings.includeNotStarted) return null;

  const reasons: FocusReason[] = [];
  let score = 0;
  const add = (text: string, points: number) => {
    if (points <= 0) return;
    score += points;
    reasons.push({ text, points: round(points, 1) });
  };

  const weaknessBias = clamp(settings.weaknessBias, 0, 100) / 50; // 0-2, 1 = neutral

  /* Mastery gap — the core signal. */
  if (mastery.value < 85) {
    add(
      mastery.value === 0
        ? 'Not started yet.'
        : `Low mastery (${mastery.value}%${mastery.assessed !== null ? `, ${mastery.assessed}% in assessments` : ''}).`,
      (85 - mastery.value) * 0.42 * weaknessBias,
    );
  }

  /* Assessment evidence specifically. */
  if (input.assessedPercent !== null && input.assessedPercent < 60) {
    add(`Weak assessment performance (${Math.round(input.assessedPercent)}%).`, 14);
  }

  /* The subject is behind its target. */
  if (input.subjectGap !== null && input.subjectGap > 0) {
    add(`Subject is ${Math.round(input.subjectGap)} points below target.`, Math.min(14, input.subjectGap * 0.7));
  }

  /* Review debt. */
  if (revision.status === 'overdue') {
    add(`Revision ${revision.label}.`, Math.min(18, 8 + Math.abs(revision.daysUntilDue ?? 0) * 0.8));
  } else if (revision.status === 'due-today') {
    add('Revision is due today.', 10);
  } else if (revision.status === 'due-soon') {
    add(`Revision ${revision.label.toLowerCase()}.`, 5);
  }

  /* Neglect. */
  const sinceStudied = daysSince(topic.lastStudied);
  if (topic.state !== 'not-started') {
    if (sinceStudied === null) {
      add('Never studied in a logged session.', 6);
    } else if (sinceStudied >= 14) {
      add(`Not studied for ${sinceStudied} days.`, Math.min(12, sinceStudied * 0.3));
    }
  }

  /* An exam is coming. */
  if (input.daysToExam !== null && input.daysToExam >= 0 && input.daysToExam <= settings.examHorizonDays) {
    const closeness = 1 - input.daysToExam / Math.max(1, settings.examHorizonDays);
    const unreadiness = (100 - mastery.value) / 100;
    add(
      `Covered by an exam in ${input.daysToExam} ${input.daysToExam === 1 ? 'day' : 'days'}.`,
      round((8 + closeness * 16) * Math.max(0.3, unreadiness), 1),
    );
  }

  /* How heavily the topic is examined, and how hard it is. */
  if (topic.importance >= 3) add('Heavily examined topic.', 7);
  else if (topic.importance === 2 && mastery.value < 60) add('Regularly examined topic.', 3);
  if (topic.difficulty >= 3 && mastery.value < 70) add('Known to be a difficult topic.', 4);

  /* What the user said themselves. */
  if (topic.weakness.trim() !== '') add('You flagged a specific difficulty here.', 8);
  if (topic.confidence !== null && topic.confidence <= 2) {
    add(`Low confidence (${topic.confidence}/5).`, (3 - topic.confidence) * 6);
  }

  /* The subject as a whole needs work. */
  if (input.subjectPriority >= 48) add('Subject is high priority overall.', 6);

  if (!reasons.length) return null;

  reasons.sort((a, b) => b.points - a.points);
  return {
    topicId: topic.id,
    subjectId: topic.subjectId,
    score: clamp(round(score, 1), 0, 200),
    minutes: suggestMinutes(input),
    reasons,
    headline: reasons[0].text,
  };
}

/**
 * Ranks recommendations, keeping the list varied: at most two topics from the
 * same subject in the top slots, so a single weak subject cannot fill the day.
 */
export function rankRecommendations(items: Recommendation[], limit = 8): Recommendation[] {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const perSubject = new Map<string, number>();
  const picked: Recommendation[] = [];
  const overflow: Recommendation[] = [];

  for (const item of sorted) {
    const used = perSubject.get(item.subjectId) ?? 0;
    if (used < 2) {
      perSubject.set(item.subjectId, used + 1);
      picked.push(item);
    } else {
      overflow.push(item);
    }
    if (picked.length >= limit) break;
  }

  return [...picked, ...overflow].slice(0, limit);
}
