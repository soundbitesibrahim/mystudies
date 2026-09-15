/**
 * Spaced review.
 *
 * A deliberately simple ladder: each time a topic is revised it moves up one
 * rung and the next review is scheduled that many days out. A weak result or
 * low confidence drops it back down.
 */

import type { Settings, Topic } from './types';
import { addDays, daysUntil, isValidISODate, toISODate } from './utils';

export const DEFAULT_INTERVALS = [1, 3, 7, 16, 35];

export function intervals(settings: Settings): number[] {
  return settings.revisionIntervals.length ? settings.revisionIntervals : DEFAULT_INTERVALS;
}

export type RevisionStatus = 'overdue' | 'due-today' | 'due-soon' | 'scheduled' | 'unscheduled';

export interface RevisionInfo {
  status: RevisionStatus;
  /** Negative when overdue. null when nothing is scheduled. */
  daysUntilDue: number | null;
  label: string;
}

/** Topics due within this many days count as "due soon". */
export const SOON_DAYS = 3;

export function revisionInfo(topic: Topic): RevisionInfo {
  if (topic.state === 'not-started') {
    return { status: 'unscheduled', daysUntilDue: null, label: 'Not started' };
  }
  if (!topic.nextRevision || !isValidISODate(topic.nextRevision)) {
    return { status: 'unscheduled', daysUntilDue: null, label: 'No review scheduled' };
  }
  const days = daysUntil(topic.nextRevision);
  if (days < 0) {
    return {
      status: 'overdue',
      daysUntilDue: days,
      label: `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`,
    };
  }
  if (days === 0) return { status: 'due-today', daysUntilDue: 0, label: 'Due today' };
  if (days <= SOON_DAYS) {
    return { status: 'due-soon', daysUntilDue: days, label: `Due in ${days} days` };
  }
  return { status: 'scheduled', daysUntilDue: days, label: `Due in ${days} days` };
}

export interface ReviewOutcome {
  /** How the review went — drives the next interval. */
  quality: 'good' | 'shaky' | 'poor';
}

/**
 * Returns the topic fields to write after a study or revision session.
 * Good reviews move up the ladder; poor ones move back down.
 */
export function scheduleNextReview(
  topic: Topic,
  settings: Settings,
  outcome: ReviewOutcome,
  today = new Date(),
): Pick<Topic, 'lastRevised' | 'nextRevision' | 'revisionStage'> {
  const ladder = intervals(settings);
  let stage = topic.revisionStage;
  if (outcome.quality === 'good') stage = Math.min(ladder.length - 1, stage + 1);
  else if (outcome.quality === 'shaky') stage = Math.max(0, stage);
  else stage = 0;

  const gap = ladder[Math.min(stage, ladder.length - 1)] ?? ladder[ladder.length - 1];
  return {
    lastRevised: toISODate(today),
    nextRevision: toISODate(addDays(today, gap)),
    revisionStage: stage,
  };
}

/** Maps a post-session self-rating onto a review outcome. */
export function outcomeFromFeedback(
  confidence: number | null,
  understanding: 'yes' | 'partly' | 'no' | null,
): ReviewOutcome {
  if (understanding === 'no' || (confidence !== null && confidence <= 2)) return { quality: 'poor' };
  if (understanding === 'partly' || (confidence !== null && confidence === 3)) {
    return { quality: 'shaky' };
  }
  return { quality: 'good' };
}
