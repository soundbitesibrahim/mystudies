/** Every computed value the UI reads, derived once from the stored data. */

import type {
  AppData,
  Assessment,
  AssessmentTopicResult,
  Chapter,
  Exam,
  Goal,
  PlanTask,
  StudySession,
  Subject,
  Topic,
} from '../lib/types';
import {
  effectivePercent,
  performanceTrend,
  subjectPerformance,
  type PerformanceResult,
  type TrendResult,
} from '../lib/performance';
import { isWeak, topicMastery, type TopicMastery } from '../lib/mastery';
import { revisionInfo, type RevisionInfo } from '../lib/revision';
import { computePriority, rankByPriority, type PriorityResult } from '../lib/priority';
import { rankRecommendations, scoreTopic, type Recommendation } from '../lib/focus';
import { computeGoalProgress, type GoalProgress } from '../lib/goals';
import { examInfo, sortExams, type ExamInfo } from '../lib/exams';
import { buildInsights, type Insight } from '../lib/coach';
import {
  minutesBySubject,
  minutesBySubjectThisWeek,
  periodTotals,
  type PeriodTotals,
  type SubjectMinutes,
} from '../lib/studyTime';
import { gradeFromPercent, percentForGrade } from '../lib/grades';
import { daysSince, mean, round, sum, todayISO } from '../lib/utils';

/** Window used when judging study-time distribution and neglect. */
const TIME_WINDOW_DAYS = 14;

/**
 * How the overall academic score is put together — surfaced in the UI.
 *
 * Syllabus coverage is deliberately NOT part of it. A Y9 student loading a
 * full IGCSE outline has barely covered any of it yet, and folding that in
 * would read as "critical" when their actual results are fine. Coverage is
 * reported alongside the score as its own figure instead.
 */
export const SCORE_WEIGHTS = { performance: 0.55, mastery: 0.45 } as const;

export interface TopicView {
  topic: Topic;
  mastery: TopicMastery;
  revision: RevisionInfo;
  /** Mean percentage across assessment topic results. */
  assessedPercent: number | null;
  resultCount: number;
  chapterName: string;
  subjectName: string;
}

export interface ChapterView {
  chapter: Chapter;
  topics: TopicView[];
  /** 0-100 syllabus completion for this chapter. */
  completion: number;
  /** 0-100 mean mastery. */
  mastery: number | null;
}

export interface SubjectView {
  subject: Subject;
  performance: PerformanceResult;
  trend: TrendResult;
  currentPercent: number | null;
  currentGrade: string | null;
  targetPercent: number | null;
  targetGrade: string | null;
  gap: number | null;
  mastery: number | null;
  coverage: number | null;
  priority: PriorityResult;
  chapters: ChapterView[];
  topics: TopicView[];
  weakTopics: TopicView[];
  strongTopics: TopicView[];
  overdueRevisions: number;
  assessments: Assessment[];
  weekMinutes: number;
  recentMinutes: number;
  totalMinutes: number;
  nextExam: { exam: Exam; info: ExamInfo } | null;
  /** The single best next action for this subject, if any. */
  nextAction: Recommendation | null;
}

export interface ScoreBreakdownRow {
  key: 'performance' | 'mastery';
  label: string;
  value: number | null;
  weight: number;
  contribution: number | null;
  note: string;
}

export interface OverallStatus {
  score: number | null;
  label: string;
  breakdown: ScoreBreakdownRow[];
  currentPercent: number | null;
  currentGrade: string | null;
  targetPercent: number | null;
  targetGrade: string | null;
  gap: number | null;
  trend: 'up' | 'flat' | 'down' | null;
  trendDelta: number | null;
  coverage: number | null;
  mastery: number | null;
  /** How many subjects contributed a performance figure. */
  scoredSubjects: number;
  totalSubjects: number;
}

export interface Derived {
  subjectViews: SubjectView[];
  bySubjectId: Map<string, SubjectView>;
  topicById: Map<string, TopicView>;
  chapterById: Map<string, Chapter>;
  ranked: SubjectView[];
  overall: OverallStatus;
  period: PeriodTotals;
  weekDistribution: { rows: SubjectMinutes[]; total: number };
  recommendations: Recommendation[];
  todayTasks: PlanTask[];
  planSummary: { planned: number; completed: number; remaining: number; tasks: number };
  goalProgress: Map<string, GoalProgress>;
  examViews: Array<{ exam: Exam; info: ExamInfo }>;
  revision: { overdue: TopicView[]; dueSoon: TopicView[]; recent: TopicView[] };
  insights: Insight[];
  counts: {
    subjects: number;
    topics: number;
    assessments: number;
    sessions: number;
    goals: number;
    exams: number;
    high: number;
    medium: number;
    maintain: number;
    goalsAchieved: number;
    weakTopics: number;
    overdueRevisions: number;
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function statusLabel(score: number | null): string {
  if (score === null) return 'Not enough data';
  if (score >= 88) return 'Excellent';
  if (score >= 78) return 'Strong';
  if (score >= 66) return 'Good';
  if (score >= 52) return 'Fair';
  if (score >= 40) return 'Struggling';
  return 'Critical';
}

export function derive(data: AppData): Derived {
  const { subjects, settings } = data;
  const thresholds = settings.gradeThresholds;

  const assessmentsBySubject = groupBy(data.assessments, (a) => a.subjectId);
  const sessionsBySubject = groupBy(data.studySessions, (s) => s.subjectId);
  const chaptersBySubject = groupBy(data.chapters, (c) => c.subjectId);
  const topicsByChapter = groupBy(data.topics, (t) => t.chapterId);

  /* Topic-level assessment evidence. */
  const resultsByTopic = new Map<string, AssessmentTopicResult[]>();
  for (const assessment of data.assessments) {
    for (const result of assessment.topicResults) {
      const list = resultsByTopic.get(result.topicId);
      if (list) list.push(result);
      else resultsByTopic.set(result.topicId, [result]);
    }
  }

  const recentWindow = minutesBySubject(data.studySessions, subjects, TIME_WINDOW_DAYS);
  const recentBySubject = new Map(recentWindow.rows.map((r) => [r.subjectId, r.minutes]));

  const period = periodTotals(data.studySessions, settings.weekStartsOn);
  const weekDistribution = minutesBySubjectThisWeek(data.studySessions, subjects, settings.weekStartsOn);
  const weekBySubject = new Map(weekDistribution.rows.map((r) => [r.subjectId, r.minutes]));

  const chapterById = new Map(data.chapters.map((c) => [c.id, c]));
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  /* Topic views first — everything else builds on them. */
  const topicById = new Map<string, TopicView>();
  const masteryById = new Map<string, TopicMastery>();
  for (const topic of data.topics) {
    const results = resultsByTopic.get(topic.id) ?? [];
    const mastery = topicMastery(topic, results);
    masteryById.set(topic.id, mastery);
    topicById.set(topic.id, {
      topic,
      mastery,
      revision: revisionInfo(topic),
      assessedPercent: mastery.assessed,
      resultCount: mastery.results,
      chapterName: chapterById.get(topic.chapterId)?.name ?? '',
      subjectName: subjectNameById.get(topic.subjectId) ?? '',
    });
  }

  const examViews = sortExams(data.exams).map((exam) => ({
    exam,
    info: examInfo(exam, data.topics, masteryById),
  }));
  const upcomingBySubject = new Map<string, { exam: Exam; info: ExamInfo }>();
  for (const view of examViews) {
    if (view.info.daysAway === null || view.info.daysAway < 0) continue;
    if (!upcomingBySubject.has(view.exam.subjectId)) upcomingBySubject.set(view.exam.subjectId, view);
  }
  /** Earliest upcoming exam covering each topic. */
  const examDaysByTopic = new Map<string, number>();
  for (const view of examViews) {
    const days = view.info.daysAway;
    if (days === null || days < 0) continue;
    const ids = view.exam.topicIds.length
      ? view.exam.topicIds
      : data.topics.filter((t) => t.subjectId === view.exam.subjectId).map((t) => t.id);
    for (const id of ids) {
      const existing = examDaysByTopic.get(id);
      if (existing === undefined || days < existing) examDaysByTopic.set(id, days);
    }
  }

  /* Mean syllabus coverage across subjects, so the coverage rule can judge a
     subject against the others rather than against an absolute. */
  const coverageBySubject = new Map<string, number>();
  for (const subject of subjects) {
    const subjectTopics = data.topics.filter((t) => t.subjectId === subject.id);
    if (!subjectTopics.length) continue;
    const values = subjectTopics.map((t) => masteryById.get(t.id)?.coverage ?? 0);
    coverageBySubject.set(subject.id, mean(values) as number);
  }
  const averageCoverage = coverageBySubject.size
    ? (mean([...coverageBySubject.values()]) as number)
    : null;

  /* Subject views. */
  const subjectViews: SubjectView[] = subjects.map((subject) => {
    const subjectAssessments = assessmentsBySubject.get(subject.id) ?? [];
    const performance = subjectPerformance(subjectAssessments);
    const trend = performanceTrend(subjectAssessments);
    const currentPercent = effectivePercent(subject, performance);

    const targetPercent =
      subject.targetPercent ??
      (subject.targetGrade ? percentForGrade(subject.targetGrade, thresholds) : null);

    const chapters = (chaptersBySubject.get(subject.id) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map<ChapterView>((chapter) => {
        const views = (topicsByChapter.get(chapter.id) ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((t) => topicById.get(t.id))
          .filter((v): v is TopicView => Boolean(v));
        const coverages = views.map((v) => v.mastery.coverage);
        const masteries = views.map((v) => v.mastery.value);
        return {
          chapter,
          topics: views,
          completion: coverages.length ? round((mean(coverages) as number) * 100, 0) : 0,
          mastery: masteries.length ? round(mean(masteries) as number, 0) : null,
        };
      });

    const topics = chapters.flatMap((c) => c.topics);
    // Mastery only means something for topics you have actually started; an
    // untouched syllabus is a coverage fact, not a mastery failure.
    const masteries = topics
      .filter((t) => t.topic.state !== 'not-started')
      .map((t) => t.mastery.value);
    const coverages = topics.map((t) => t.mastery.coverage);

    const weakTopics = topics
      .filter((t) => isWeak(t.mastery) || (t.assessedPercent !== null && t.assessedPercent < 55))
      .sort((a, b) => a.mastery.value - b.mastery.value);
    const strongTopics = topics
      .filter((t) => t.mastery.value >= 75)
      .sort((a, b) => b.mastery.value - a.mastery.value);
    const overdueRevisions = topics.filter((t) => t.revision.status === 'overdue').length;

    const nextExam = upcomingBySubject.get(subject.id) ?? null;

    const priority = computePriority({
      subject,
      performance,
      trend,
      currentPercent,
      targetPercent,
      mastery: masteries.length ? round(mean(masteries) as number, 0) : null,
      coverage: coverages.length ? (mean(coverages) as number) : null,
      averageCoverage,
      weakTopics: weakTopics.length,
      overdueRevisions,
      daysToExam: nextExam?.info.daysAway ?? null,
      examHorizonDays: settings.examHorizonDays,
      recentMinutes: recentBySubject.get(subject.id) ?? 0,
      totalRecentMinutes: recentWindow.total,
      subjectCount: subjects.length,
    });

    return {
      subject,
      performance,
      trend,
      currentPercent,
      currentGrade:
        currentPercent === null ? null : gradeFromPercent(currentPercent, thresholds),
      targetPercent,
      targetGrade:
        subject.targetGrade ??
        (subject.targetPercent === null ? null : gradeFromPercent(subject.targetPercent, thresholds)),
      gap:
        currentPercent === null || targetPercent === null
          ? null
          : round(targetPercent - currentPercent, 0),
      mastery: masteries.length ? round(mean(masteries) as number, 0) : null,
      coverage: coverages.length ? (mean(coverages) as number) : null,
      priority,
      chapters,
      topics,
      weakTopics,
      strongTopics,
      overdueRevisions,
      assessments: subjectAssessments,
      weekMinutes: weekBySubject.get(subject.id) ?? 0,
      recentMinutes: recentBySubject.get(subject.id) ?? 0,
      totalMinutes: sum((sessionsBySubject.get(subject.id) ?? []).map((s) => s.minutes)),
      nextExam,
      nextAction: null,
    };
  });

  const bySubjectId = new Map(subjectViews.map((v) => [v.subject.id, v]));

  /* Recommendations across every topic. */
  const allRecommendations: Recommendation[] = [];
  for (const view of subjectViews) {
    for (const topicView of view.topics) {
      const rec = scoreTopic({
        topic: topicView.topic,
        mastery: topicView.mastery,
        revision: topicView.revision,
        subjectGap: view.gap,
        subjectPriority: view.priority.score,
        daysToExam: examDaysByTopic.get(topicView.topic.id) ?? null,
        assessedPercent: topicView.assessedPercent,
        settings,
      });
      if (rec) allRecommendations.push(rec);
    }
  }
  const recommendations = rankRecommendations(allRecommendations, 10);

  // Best single action per subject, for the subject detail page.
  const bestBySubject = new Map<string, Recommendation>();
  for (const rec of [...allRecommendations].sort((a, b) => b.score - a.score)) {
    if (!bestBySubject.has(rec.subjectId)) bestBySubject.set(rec.subjectId, rec);
  }
  for (const view of subjectViews) {
    view.nextAction = bestBySubject.get(view.subject.id) ?? null;
  }

  /* Overall status. */
  const performances = subjectViews
    .map((v) => v.currentPercent)
    .filter((n): n is number => n !== null);
  const subjectMasteries = subjectViews.map((v) => v.mastery).filter((n): n is number => n !== null);
  const subjectCoverages = subjectViews.map((v) => v.coverage).filter((n): n is number => n !== null);
  const deltas = subjectViews.map((v) => v.trend.delta).filter((n): n is number => n !== null);

  const perfValue = performances.length ? round(mean(performances) as number, 0) : null;
  const masteryValue = subjectMasteries.length ? round(mean(subjectMasteries) as number, 0) : null;
  const coverageValue = subjectCoverages.length
    ? round((mean(subjectCoverages) as number) * 100, 0)
    : null;

  const rows: ScoreBreakdownRow[] = [
    {
      key: 'performance',
      label: 'Assessment performance',
      value: perfValue,
      weight: SCORE_WEIGHTS.performance,
      contribution: null,
      note: perfValue === null ? 'No results recorded yet' : `Mean across ${performances.length} subjects`,
    },
    {
      key: 'mastery',
      label: 'Topic mastery',
      value: masteryValue,
      weight: SCORE_WEIGHTS.mastery,
      contribution: null,
      note:
        masteryValue === null
          ? 'No topics started yet'
          : `Mean across ${subjectMasteries.length} subjects, started topics only`,
    },
  ];

  // Weights renormalise over whatever exists, so a missing signal is never a zero.
  const available = rows.filter((r) => r.value !== null);
  const weightTotal = available.reduce((acc, r) => acc + r.weight, 0);
  let overallScore: number | null = null;
  if (weightTotal > 0) {
    overallScore = round(
      available.reduce((acc, r) => acc + (r.value as number) * r.weight, 0) / weightTotal,
      0,
    );
    for (const row of rows) {
      row.contribution =
        row.value === null ? null : round(((row.value * row.weight) / weightTotal), 1);
    }
  }

  const targetPercents = subjectViews
    .map((v) => v.targetPercent)
    .filter((n): n is number => n !== null);
  const overallTarget = targetPercents.length ? round(mean(targetPercents) as number, 0) : null;
  const trendDelta = deltas.length ? round(mean(deltas) as number, 1) : null;

  const overall: OverallStatus = {
    score: overallScore,
    label: statusLabel(overallScore),
    breakdown: rows,
    currentPercent: perfValue,
    currentGrade: perfValue === null ? null : gradeFromPercent(perfValue, thresholds),
    targetPercent: overallTarget,
    targetGrade: overallTarget === null ? null : gradeFromPercent(overallTarget, thresholds),
    gap: perfValue === null || overallTarget === null ? null : round(overallTarget - perfValue, 0),
    trend: trendDelta === null ? null : trendDelta > 3 ? 'up' : trendDelta < -3 ? 'down' : 'flat',
    trendDelta,
    coverage: coverageValue,
    mastery: masteryValue,
    scoredSubjects: performances.length,
    totalSubjects: subjects.length,
  };

  /* Today's plan. */
  const today = todayISO();
  const todayTasks = data.planTasks
    .filter((t) => t.date === today)
    .sort((a, b) => (a.at && b.at ? a.at.localeCompare(b.at) : a.order - b.order));
  const planSummary = {
    planned: sum(todayTasks.filter((t) => t.status !== 'skipped').map((t) => t.minutes)),
    completed: sum(todayTasks.filter((t) => t.status === 'done').map((t) => t.minutes)),
    remaining: sum(todayTasks.filter((t) => t.status === 'planned').map((t) => t.minutes)),
    tasks: todayTasks.length,
  };

  /* Revision buckets. */
  const allTopicViews = [...topicById.values()];
  const revision = {
    overdue: allTopicViews
      .filter((t) => t.revision.status === 'overdue' || t.revision.status === 'due-today')
      .sort((a, b) => (a.revision.daysUntilDue ?? 0) - (b.revision.daysUntilDue ?? 0)),
    dueSoon: allTopicViews
      .filter((t) => t.revision.status === 'due-soon' || t.revision.status === 'scheduled')
      .sort((a, b) => (a.revision.daysUntilDue ?? 0) - (b.revision.daysUntilDue ?? 0))
      .slice(0, 20),
    recent: allTopicViews
      .filter((t) => t.topic.lastRevised !== null)
      .sort((a, b) => (b.topic.lastRevised ?? '').localeCompare(a.topic.lastRevised ?? ''))
      .slice(0, 20),
  };

  /* Goals. */
  const goalProgress = new Map<string, GoalProgress>();
  for (const goal of data.goals) {
    const view = goal.subjectId ? bySubjectId.get(goal.subjectId) : null;
    const examReadiness = goal.examId
      ? (examViews.find((e) => e.exam.id === goal.examId)?.info.readiness ?? null)
      : null;
    goalProgress.set(
      goal.id,
      computeGoalProgress(goal, {
        performance: goal.scope === 'overall' ? perfValue : (view?.currentPercent ?? null),
        syllabus:
          goal.scope === 'overall'
            ? coverageValue
            : view?.coverage === null || view?.coverage === undefined
              ? null
              : round(view.coverage * 100, 0),
        weekMinutes: goal.scope === 'overall' ? period.thisWeek : (view?.weekMinutes ?? 0),
        examReadiness,
        thresholds,
      }),
    );
  }

  /* Coach insights. */
  const weakestTopicView = allTopicViews
    .filter((t) => t.topic.state !== 'not-started')
    .sort((a, b) => a.mastery.value - b.mastery.value)[0];
  const staleTopicView = allTopicViews
    .filter((t) => t.topic.state !== 'not-started' && t.topic.lastRevised !== null)
    .map((t) => ({ t, days: daysSince(t.topic.lastRevised) ?? 0 }))
    .filter((x) => x.days >= 14)
    .sort((a, b) => b.days - a.days)[0];
  const nextExamView = examViews.find((e) => e.info.daysAway !== null && e.info.daysAway >= 0);

  const insights = buildInsights({
    subjects: subjectViews.map((v) => ({
      id: v.subject.id,
      name: v.subject.name,
      priorityScore: v.priority.score,
      priorityLevel: v.priority.level,
      currentPercent: v.currentPercent,
      targetPercent: v.targetPercent,
      trendDirection: v.trend.direction,
      trendDelta: v.trend.delta,
      mastery: v.mastery,
      coverage: v.coverage,
      recentMinutes: v.recentMinutes,
      overdueRevisions: v.overdueRevisions,
    })),
    totalRecentMinutes: recentWindow.total,
    weekMinutes: period.thisWeek,
    lastWeekMinutes: period.lastWeek,
    weakestTopic: weakestTopicView
      ? {
          name: weakestTopicView.topic.name,
          subjectName: weakestTopicView.subjectName,
          mastery: weakestTopicView.mastery.value,
        }
      : null,
    staleTopic: staleTopicView
      ? {
          name: staleTopicView.t.topic.name,
          subjectName: staleTopicView.t.subjectName,
          days: staleTopicView.days,
        }
      : null,
    nextExam: nextExamView
      ? {
          name: nextExamView.exam.name,
          subjectName: subjectNameById.get(nextExamView.exam.subjectId) ?? '',
          daysAway: nextExamView.info.daysAway ?? 0,
          remaining: nextExamView.info.remaining,
        }
      : null,
  });

  const levelCount = (level: 'high' | 'medium' | 'maintain') =>
    subjectViews.filter((v) => v.priority.level === level).length;

  return {
    subjectViews,
    bySubjectId,
    topicById,
    chapterById,
    ranked: rankByPriority(subjectViews),
    overall,
    period,
    weekDistribution,
    recommendations,
    todayTasks,
    planSummary,
    goalProgress,
    examViews,
    revision,
    insights,
    counts: {
      subjects: subjects.length,
      topics: data.topics.length,
      assessments: data.assessments.length,
      sessions: data.studySessions.length,
      goals: data.goals.length,
      exams: data.exams.length,
      high: levelCount('high'),
      medium: levelCount('medium'),
      maintain: levelCount('maintain'),
      goalsAchieved: [...goalProgress.values()].filter((g) => g.status === 'achieved').length,
      weakTopics: subjectViews.reduce((acc, v) => acc + v.weakTopics.length, 0),
      overdueRevisions: revision.overdue.length,
    },
  };
}

export type { Goal, Subject, Topic, Chapter, Exam, StudySession, PlanTask, Assessment };
