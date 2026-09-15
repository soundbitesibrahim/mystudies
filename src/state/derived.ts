/** Everything the UI reads is derived here, once, from the stored data. */

import type { AppData, Assessment, Goal, StudyLog, Subject } from '../lib/types';
import {
  overallStatus,
  subjectHealth,
  subjectTrend,
  summariseAssessments,
  type AssessmentSummary,
  type OverallStatus,
  type SubjectHealth,
  type TrendResult,
} from '../lib/scoring';
import { computePriority, rankByPriority, type PriorityResult } from '../lib/priority';
import { computeGoalProgress, type GoalProgress } from '../lib/goals';
import {
  minutesBySubject,
  minutesBySubjectThisWeek,
  weekTotals,
  type SubjectMinutes,
  type WeekTotals,
} from '../lib/studyTime';
import { sum } from '../lib/utils';

/** The recent window used when judging study-time distribution. */
const TIME_WINDOW_DAYS = 14;

export interface SubjectView {
  subject: Subject;
  health: SubjectHealth;
  trend: TrendResult;
  assessments: AssessmentSummary;
  priority: PriorityResult;
  /** Minutes logged this week for this subject. */
  weekMinutes: number;
  totalMinutes: number;
}

export interface Derived {
  subjectViews: SubjectView[];
  bySubjectId: Map<string, SubjectView>;
  ranked: SubjectView[];
  overall: OverallStatus;
  week: WeekTotals;
  weekDistribution: { rows: SubjectMinutes[]; total: number };
  goalProgress: Map<string, GoalProgress>;
  counts: {
    subjects: number;
    assessments: number;
    studyLogs: number;
    goals: number;
    high: number;
    medium: number;
    maintain: number;
    goalsAchieved: number;
  };
}

function groupBySubject<T extends { subjectId: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.subjectId);
    if (list) list.push(item);
    else map.set(item.subjectId, [item]);
  }
  return map;
}

export function derive(data: AppData): Derived {
  const { subjects, settings } = data;
  const assessmentsBySubject = groupBySubject<Assessment>(data.assessments);
  const logsBySubject = groupBySubject<StudyLog>(data.studyLogs);

  const recentWindow = minutesBySubject(data.studyLogs, subjects, TIME_WINDOW_DAYS);
  const recentBySubject = new Map(recentWindow.rows.map((r) => [r.subjectId, r.minutes]));

  const week = weekTotals(data.studyLogs, settings.weekStartsOn);
  const weekDistribution = minutesBySubjectThisWeek(data.studyLogs, subjects, settings.weekStartsOn);
  const weekBySubject = new Map(weekDistribution.rows.map((r) => [r.subjectId, r.minutes]));

  const healths = new Map<string, SubjectHealth>();
  const trends = new Map<string, TrendResult>();

  const subjectViews: SubjectView[] = subjects.map((subject) => {
    const subjectAssessments = assessmentsBySubject.get(subject.id) ?? [];
    const health = subjectHealth(subject, subjectAssessments);
    const trend = subjectTrend(subjectAssessments);
    const summary = summariseAssessments(subjectAssessments);
    healths.set(subject.id, health);
    trends.set(subject.id, trend);

    const priority = computePriority({
      subject,
      health,
      trend,
      assessments: summary,
      recentMinutes: recentBySubject.get(subject.id) ?? 0,
      totalRecentMinutes: recentWindow.total,
      subjectCount: subjects.length,
    });

    return {
      subject,
      health,
      trend,
      assessments: summary,
      priority,
      weekMinutes: weekBySubject.get(subject.id) ?? 0,
      totalMinutes: sum((logsBySubject.get(subject.id) ?? []).map((l) => l.minutes)),
    };
  });

  const byId = new Map(subjectViews.map((v) => [v.subject.id, v]));
  const ranked = rankByPriority(subjectViews.map((v) => v.priority))
    .map((p) => byId.get(p.subjectId))
    .filter((v): v is SubjectView => Boolean(v));

  const goalProgress = new Map<string, GoalProgress>();
  data.goals.forEach((goal: Goal) => {
    goalProgress.set(goal.id, computeGoalProgress(goal, subjects, healths));
  });

  const levelCount = (level: 'high' | 'medium' | 'maintain') =>
    subjectViews.filter((v) => v.priority.level === level).length;

  return {
    subjectViews,
    bySubjectId: byId,
    ranked,
    overall: overallStatus(subjects, healths, trends),
    week,
    weekDistribution,
    goalProgress,
    counts: {
      subjects: subjects.length,
      assessments: data.assessments.length,
      studyLogs: data.studyLogs.length,
      goals: data.goals.length,
      high: levelCount('high'),
      medium: levelCount('medium'),
      maintain: levelCount('maintain'),
      goalsAchieved: [...goalProgress.values()].filter((g) => g.status === 'achieved').length,
    },
  };
}
