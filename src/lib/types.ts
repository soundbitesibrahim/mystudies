/** Core domain types for the Academic Command Center. */

export type Grade = 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type PriorityLevel = 'high' | 'medium' | 'maintain';

export type Trend = 'up' | 'flat' | 'down';

/** Where a piece of syllabus content came from. */
export type Source = 'seed' | 'user';

/* --------------------------------- subjects -------------------------------- */

export interface Subject {
  id: string;
  name: string;
  /** Syllabus code, e.g. "0620". '' when the user does not use one. */
  code: string;
  /** How strong/confident the user feels overall, 0-100. null = not rated. */
  rating: number | null;
  /** Manually recorded current performance, used when assessments are thin. */
  currentPercent: number | null;
  currentGrade: Grade | null;
  targetPercent: number | null;
  targetGrade: Grade | null;
  /** Free text: why this subject is hard right now. */
  weakness: string;
  priorityOverride: PriorityLevel | null;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------------- syllabus -------------------------------- */

export interface Chapter {
  id: string;
  subjectId: string;
  /** Syllabus reference, e.g. "2". '' when not numbered. */
  code: string;
  name: string;
  order: number;
  source: Source;
}

/** Ordered weakest to strongest. */
export type MasteryState = 'not-started' | 'learning' | 'practicing' | 'strong' | 'mastered';

export interface Topic {
  id: string;
  chapterId: string;
  subjectId: string;
  code: string;
  name: string;
  order: number;
  state: MasteryState;
  /** Explicit 0-100 override. null = derive from the mastery state. */
  masteryPercent: number | null;
  /** Self-reported confidence, 1-5. null = not given. */
  confidence: number | null;
  /** 1 = straightforward, 2 = moderate, 3 = hard. */
  difficulty: number;
  /** 1 = minor, 2 = normal, 3 = heavily examined. */
  importance: number;
  notes: string;
  weakness: string;
  lastStudied: string | null;
  lastRevised: string | null;
  nextRevision: string | null;
  /** Index into the spaced-review interval ladder. */
  revisionStage: number;
  source: Source;
}

/* ------------------------------- assessments ------------------------------- */

export type AssessmentType =
  | 'quiz'
  | 'homework'
  | 'class-test'
  | 'mock-exam'
  | 'past-paper'
  | 'exam'
  | 'other';

export interface AssessmentTopicResult {
  topicId: string;
  score: number;
  maxScore: number;
}

export interface Assessment {
  id: string;
  subjectId: string;
  /** Optional chapter this assessment covered. */
  chapterId: string | null;
  name: string;
  type: AssessmentType;
  date: string;
  score: number;
  maxScore: number;
  note: string;
  /** Per-topic breakdown. Drives topic-level performance. */
  topicResults: AssessmentTopicResult[];
  createdAt: string;
}

/* --------------------------------- studying -------------------------------- */

export type Understanding = 'yes' | 'partly' | 'no';

export interface StudySession {
  id: string;
  subjectId: string;
  /** null when the session was not tied to one topic. */
  topicId: string | null;
  date: string;
  minutes: number;
  note: string;
  /** Post-session self-rating, 1-5. */
  confidence: number | null;
  understanding: Understanding | null;
  createdAt: string;
}

/** A task on the daily plan — recommended by the engine or added by hand. */
export type PlanTaskStatus = 'planned' | 'done' | 'skipped' | 'snoozed';

export interface PlanTask {
  id: string;
  date: string;
  subjectId: string;
  topicId: string | null;
  minutes: number;
  /** Optional clock time, "09:00". '' when unscheduled. */
  at: string;
  status: PlanTaskStatus;
  /** True when the engine proposed it, false when the user added it. */
  fromEngine: boolean;
  /** The engine's reasons, frozen at the time it was added to the plan. */
  reasons: string[];
  order: number;
  createdAt: string;
}

/* ----------------------------- goals and exams ----------------------------- */

export type GoalScope = 'subject' | 'overall';
export type GoalKind = 'grade' | 'percent' | 'syllabus' | 'study-time' | 'exam';

export interface Goal {
  id: string;
  scope: GoalScope;
  subjectId: string | null;
  kind: GoalKind;
  targetPercent: number | null;
  targetGrade: Grade | null;
  /** Minutes per week, for study-time goals. */
  targetMinutes: number | null;
  /** For exam goals. */
  examId: string | null;
  deadline: string;
  note: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  name: string;
  date: string;
  targetPercent: number | null;
  targetGrade: Grade | null;
  /** Topics the exam covers. Empty = the whole subject. */
  topicIds: string[];
  note: string;
  createdAt: string;
}

/* --------------------------------- settings -------------------------------- */

export type ThemePreference = 'system' | 'light' | 'dark';

/** Minimum percentage for each grade, highest first. */
export interface GradeThreshold {
  grade: Grade;
  min: number;
}

export interface Settings {
  theme: ThemePreference;
  weekStartsOn: 'mon' | 'sun';
  gradeThresholds: GradeThreshold[];
  defaultSessionMinutes: number;
  /** Daily study target in minutes, used by the plan. */
  dailyTargetMinutes: number;
  /** How hard the engine leans towards weak topics, 0-100. */
  weaknessBias: number;
  /** Days ahead an exam starts lifting topic priority. */
  examHorizonDays: number;
  /** Spaced-review interval ladder, in days. */
  revisionIntervals: number[];
  /** Whether the engine may recommend topics not yet started. */
  includeNotStarted: boolean;
}

/* ---------------------------------- root ----------------------------------- */

export interface AppData {
  version: number;
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  assessments: Assessment[];
  studySessions: StudySession[];
  planTasks: PlanTask[];
  goals: Goal[];
  exams: Exam[];
  settings: Settings;
  /** Seeded-syllabus notices the user has dismissed. */
  dismissedNotices: string[];
  updatedAt: string;
}
