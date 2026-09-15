/** Core domain types for the Academic Command Center. */

export type Grade = 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type PriorityLevel = 'high' | 'medium' | 'maintain';

export type Trend = 'up' | 'flat' | 'down';

/**
 * Reserved for a future release: subject -> syllabus -> topic -> progress.
 * The shape is defined so stored data stays forward-compatible, but nothing
 * in the current version creates or displays topics.
 */
export interface SyllabusTopic {
  id: string;
  name: string;
  /** 0-100, user reported. */
  progress: number;
  parentId: string | null;
}

export interface Subject {
  id: string;
  name: string;
  /** How strong/confident the user feels, 0-100. null = not rated yet. */
  rating: number | null;
  /** Current performance as a percentage. null = not recorded. */
  currentPercent: number | null;
  /** Current performance as a letter grade. null = not recorded. */
  currentGrade: Grade | null;
  targetPercent: number | null;
  targetGrade: Grade | null;
  /** Free text: why this subject is hard right now. '' = none given. */
  weakness: string;
  /** Manual override of the priority engine. null = let the engine decide. */
  priorityOverride: PriorityLevel | null;
  /** Reserved for syllabus tracking. Always [] in this version. */
  topics: SyllabusTopic[];
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  subjectId: string;
  name: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  score: number;
  maxScore: number;
  note: string;
  createdAt: string;
}

export interface StudyLog {
  id: string;
  subjectId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  minutes: number;
  note: string;
  createdAt: string;
}

export type GoalScope = 'subject' | 'overall';
export type GoalTargetType = 'percent' | 'grade';

export interface Goal {
  id: string;
  scope: GoalScope;
  /** null when scope === 'overall'. */
  subjectId: string | null;
  targetType: GoalTargetType;
  targetPercent: number | null;
  targetGrade: Grade | null;
  /** ISO date or '' for no deadline. */
  deadline: string;
  note: string;
  createdAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  /** Kept in settings so calculations and the UI agree on week boundaries. */
  weekStartsOn: 'mon' | 'sun';
}

export interface AppData {
  version: number;
  subjects: Subject[];
  assessments: Assessment[];
  studyLogs: StudyLog[];
  goals: Goal[];
  settings: Settings;
  updatedAt: string;
}
