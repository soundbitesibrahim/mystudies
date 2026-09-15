/**
 * Coach insights.
 *
 * Plain rules over the user's own data — no model, and the UI says so. Each
 * insight only appears when the data genuinely supports it.
 */

import { formatMinutes, pluralize, round } from './utils';

export type InsightTone = 'risk' | 'attention' | 'positive' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  text: string;
}

export interface CoachInput {
  subjects: Array<{
    id: string;
    name: string;
    priorityScore: number;
    priorityLevel: 'high' | 'medium' | 'maintain';
    currentPercent: number | null;
    targetPercent: number | null;
    trendDirection: 'up' | 'flat' | 'down' | null;
    trendDelta: number | null;
    mastery: number | null;
    coverage: number | null;
    recentMinutes: number;
    overdueRevisions: number;
  }>;
  totalRecentMinutes: number;
  weekMinutes: number;
  lastWeekMinutes: number;
  weakestTopic: { name: string; subjectName: string; mastery: number } | null;
  staleTopic: { name: string; subjectName: string; days: number } | null;
  nextExam: { name: string; subjectName: string; daysAway: number; remaining: number } | null;
}

export function buildInsights(input: CoachInput): Insight[] {
  const out: Insight[] = [];
  const { subjects } = input;
  if (!subjects.length) return out;

  /* Biggest risk. */
  const ranked = [...subjects].sort((a, b) => b.priorityScore - a.priorityScore);
  const riskiest = ranked[0];
  if (riskiest && riskiest.priorityLevel === 'high') {
    out.push({
      id: 'risk',
      tone: 'risk',
      text: `${riskiest.name} is currently your biggest academic risk.`,
    });
  }

  /* Study time spent on subjects that do not need it. */
  if (input.totalRecentMinutes >= 120) {
    const overStudied = subjects
      .map((s) => ({ s, share: s.recentMinutes / input.totalRecentMinutes }))
      .filter(({ s, share }) => share >= 0.35 && s.priorityLevel === 'maintain')
      .sort((a, b) => b.share - a.share)[0];
    if (overStudied) {
      out.push({
        id: 'imbalance',
        tone: 'attention',
        text: `You are spending ${Math.round(overStudied.share * 100)}% of your study time on ${
          overStudied.s.name
        }, which is already at or above target.`,
      });
    }

    const neglected = subjects
      .filter((s) => s.priorityLevel === 'high' && s.recentMinutes / input.totalRecentMinutes < 0.1)
      .sort((a, b) => b.priorityScore - a.priorityScore)[0];
    if (neglected) {
      out.push({
        id: 'neglected',
        tone: 'risk',
        text: `${neglected.name} is high priority but has had almost none of your recent study time.`,
      });
    }
  }

  /* Genuine improvement is worth saying out loud. */
  const improved = subjects
    .filter((s) => s.trendDirection === 'up' && (s.trendDelta ?? 0) >= 5)
    .sort((a, b) => (b.trendDelta ?? 0) - (a.trendDelta ?? 0))[0];
  if (improved) {
    out.push({
      id: 'improved',
      tone: 'positive',
      text: `${improved.name} has improved by ${round(improved.trendDelta ?? 0, 1)} points across your recent results.`,
    });
  }

  const declined = subjects
    .filter((s) => s.trendDirection === 'down')
    .sort((a, b) => (a.trendDelta ?? 0) - (b.trendDelta ?? 0))[0];
  if (declined) {
    out.push({
      id: 'declined',
      tone: 'risk',
      text: `${declined.name} results have dropped ${Math.abs(round(declined.trendDelta ?? 0, 1))} points recently.`,
    });
  }

  /* Weakest tracked area. */
  if (input.weakestTopic) {
    out.push({
      id: 'weakest',
      tone: 'attention',
      text: `${input.weakestTopic.subjectName} — ${input.weakestTopic.name} is your weakest tracked topic at ${input.weakestTopic.mastery}% mastery.`,
    });
  }

  /* Something going stale. */
  if (input.staleTopic) {
    out.push({
      id: 'stale',
      tone: 'attention',
      text: `You have not revised ${input.staleTopic.subjectName} — ${input.staleTopic.name} for ${input.staleTopic.days} days.`,
    });
  }

  /* Review debt across the board. */
  const overdue = subjects.reduce((acc, s) => acc + s.overdueRevisions, 0);
  if (overdue >= 3) {
    out.push({
      id: 'overdue',
      tone: 'attention',
      text: `${overdue} topics are overdue for revision across your subjects.`,
    });
  }

  /* Exam pressure. */
  if (input.nextExam && input.nextExam.daysAway >= 0 && input.nextExam.daysAway <= 30) {
    out.push({
      id: 'exam',
      tone: input.nextExam.daysAway <= 14 ? 'risk' : 'attention',
      text: `${input.nextExam.name} is ${input.nextExam.daysAway} ${pluralize(
        input.nextExam.daysAway,
        'day',
      )} away with ${input.nextExam.remaining} ${pluralize(
        input.nextExam.remaining,
        'topic',
      )} not yet strong.`,
    });
  }

  /* Study volume. */
  if (input.lastWeekMinutes > 0 || input.weekMinutes > 0) {
    const delta = input.weekMinutes - input.lastWeekMinutes;
    if (Math.abs(delta) >= 45) {
      out.push({
        id: 'volume',
        tone: delta > 0 ? 'positive' : 'attention',
        text:
          delta > 0
            ? `You have studied ${formatMinutes(delta)} more than last week.`
            : `You have studied ${formatMinutes(Math.abs(delta))} less than last week.`,
      });
    }
  }

  return out.slice(0, 6);
}
