/**
 * Topic mastery.
 *
 * The user declares a state; assessment results refine it. Both are shown
 * separately in the UI so a number is never presented as more certain than
 * the evidence behind it.
 */

import type { AssessmentTopicResult, MasteryState, Topic } from './types';
import { clamp, mean, round } from './utils';

export const MASTERY_STATES: MasteryState[] = [
  'not-started',
  'learning',
  'practicing',
  'strong',
  'mastered',
];

export const MASTERY_META: Record<
  MasteryState,
  { label: string; short: string; band: number; tone: 'none' | 'weak' | 'mid' | 'good' }
> = {
  'not-started': { label: 'Not started', short: 'Not started', band: 0, tone: 'none' },
  learning: { label: 'Learning', short: 'Learning', band: 32, tone: 'weak' },
  practicing: { label: 'Practising', short: 'Practising', band: 58, tone: 'mid' },
  strong: { label: 'Strong', short: 'Strong', band: 80, tone: 'good' },
  mastered: { label: 'Mastered', short: 'Mastered', band: 95, tone: 'good' },
};

/** How much of the syllabus a state counts as covered, 0-1. */
const COVERAGE: Record<MasteryState, number> = {
  'not-started': 0,
  learning: 0.35,
  practicing: 0.65,
  strong: 0.9,
  mastered: 1,
};

export interface TopicMastery {
  /** 0-100 blended mastery. */
  value: number;
  /** Declared state contribution only. */
  declared: number;
  /** Assessment evidence, or null when there is none. */
  assessed: number | null;
  /** How many topic-level results back this up. */
  results: number;
  state: MasteryState;
  /** 0-1 syllabus coverage credit. */
  coverage: number;
}

export function resultPercent(result: AssessmentTopicResult): number {
  if (!result.maxScore) return 0;
  return clamp((result.score / result.maxScore) * 100, 0, 100);
}

/**
 * Blends the declared state (or explicit override) with assessment evidence.
 * With no evidence the declared value stands alone.
 */
export function topicMastery(topic: Topic, results: AssessmentTopicResult[]): TopicMastery {
  const declared = topic.masteryPercent ?? MASTERY_META[topic.state].band;
  const percents = results.map(resultPercent);
  const assessed = percents.length ? round(mean(percents) as number, 0) : null;

  // Evidence gains weight as results accumulate, capped at an even split.
  const evidenceWeight = assessed === null ? 0 : Math.min(0.5, 0.2 * percents.length);
  const value = round(declared * (1 - evidenceWeight) + (assessed ?? 0) * evidenceWeight, 0);

  return {
    value: clamp(value, 0, 100),
    declared,
    assessed,
    results: percents.length,
    state: topic.state,
    coverage: COVERAGE[topic.state],
  };
}

/** Suggests the state a mastery percentage corresponds to. */
export function stateFromPercent(percent: number): MasteryState {
  if (percent >= 90) return 'mastered';
  if (percent >= 75) return 'strong';
  if (percent >= 50) return 'practicing';
  if (percent > 0) return 'learning';
  return 'not-started';
}

export function isWeak(mastery: TopicMastery): boolean {
  return mastery.state !== 'not-started' && mastery.value < 55;
}
