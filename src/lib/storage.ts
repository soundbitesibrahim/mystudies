/**
 * Local-first persistence, with migration.
 *
 * One versioned JSON document in localStorage. Version 1 data (subjects,
 * assessments, study logs, goals, settings) is migrated forward rather than
 * discarded — see migrateV1. Import and export use the same validated shape.
 */

import type {
  AppData,
  Assessment,
  AssessmentTopicResult,
  AssessmentType,
  Chapter,
  Exam,
  Goal,
  GoalKind,
  Grade,
  GradeThreshold,
  MasteryState,
  PlanTask,
  PriorityLevel,
  Settings,
  Source,
  StudySession,
  Subject,
  ThemePreference,
  Topic,
  Understanding,
} from './types';
import { DEFAULT_THRESHOLDS, isGrade } from './grades';
import { MASTERY_STATES } from './mastery';
import { DEFAULT_INTERVALS } from './revision';
import { clamp, isValidISODate, todayISO, uid } from './utils';

export const STORAGE_KEY = 'acc.data';
export const DATA_VERSION = 2;
export const EXPORT_APP_ID = 'academic-command-center';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  weekStartsOn: 'mon',
  gradeThresholds: DEFAULT_THRESHOLDS,
  defaultSessionMinutes: 30,
  dailyTargetMinutes: 90,
  weaknessBias: 50,
  examHorizonDays: 30,
  revisionIntervals: DEFAULT_INTERVALS,
  includeNotStarted: true,
};

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    subjects: [],
    chapters: [],
    topics: [],
    assessments: [],
    studySessions: [],
    planTasks: [],
    goals: [],
    exams: [],
    settings: { ...DEFAULT_SETTINGS, gradeThresholds: [...DEFAULT_THRESHOLDS] },
    dismissedNotices: [],
    updatedAt: new Date().toISOString(),
  };
}

/* --------------------------------- helpers -------------------------------- */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function numOrNull(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return clamp(v, min, max);
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

const gradeOrNull = (v: unknown): Grade | null => (isGrade(v) ? v : null);

const dateOr = (v: unknown, fallback: string): string => {
  const s = str(v);
  return isValidISODate(s) ? s : fallback;
};

const dateOrNull = (v: unknown): string | null => {
  const s = str(v);
  return isValidISODate(s) ? s : null;
};

const source = (v: unknown): Source => (v === 'seed' ? 'seed' : 'user');

const masteryState = (v: unknown): MasteryState =>
  MASTERY_STATES.includes(v as MasteryState) ? (v as MasteryState) : 'not-started';

const ASSESSMENT_TYPES: AssessmentType[] = [
  'quiz',
  'homework',
  'class-test',
  'mock-exam',
  'past-paper',
  'exam',
  'other',
];

const assessmentType = (v: unknown): AssessmentType =>
  ASSESSMENT_TYPES.includes(v as AssessmentType) ? (v as AssessmentType) : 'other';

const GOAL_KINDS: GoalKind[] = ['grade', 'percent', 'syllabus', 'study-time', 'exam'];

const goalKind = (v: unknown): GoalKind => (GOAL_KINDS.includes(v as GoalKind) ? (v as GoalKind) : 'percent');

const understanding = (v: unknown): Understanding | null =>
  v === 'yes' || v === 'partly' || v === 'no' ? v : null;

const priorityOverride = (v: unknown): PriorityLevel | null =>
  v === 'high' || v === 'medium' || v === 'maintain' ? v : null;

const theme = (v: unknown): ThemePreference =>
  v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_SETTINGS.theme;

function parseThresholds(v: unknown): GradeThreshold[] {
  if (!Array.isArray(v)) return [...DEFAULT_THRESHOLDS];
  const parsed = v
    .map((item) => {
      if (!isObj(item) || !isGrade(item.grade)) return null;
      return { grade: item.grade, min: num(item.min, 0, 0, 100) };
    })
    .filter((x): x is GradeThreshold => x !== null);
  // Every grade must be present or the scale has holes.
  return parsed.length === DEFAULT_THRESHOLDS.length ? parsed : [...DEFAULT_THRESHOLDS];
}

/* -------------------------------- validation ------------------------------ */

export interface ParseReport {
  subjects: number;
  chapters: number;
  topics: number;
  assessments: number;
  studySessions: number;
  goals: number;
  exams: number;
  planTasks: number;
  dropped: number;
  migratedFrom: number | null;
}

function parseSubject(raw: unknown): Subject | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name).trim();
  if (!name) return null;
  const now = new Date().toISOString();
  return {
    id: str(raw.id) || uid('sub'),
    name: name.slice(0, 80),
    code: str(raw.code).trim().slice(0, 16),
    rating: numOrNull(raw.rating, 0, 100),
    currentPercent: numOrNull(raw.currentPercent, 0, 100),
    currentGrade: gradeOrNull(raw.currentGrade),
    targetPercent: numOrNull(raw.targetPercent, 0, 100),
    targetGrade: gradeOrNull(raw.targetGrade),
    weakness: str(raw.weakness).slice(0, 500),
    priorityOverride: priorityOverride(raw.priorityOverride),
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
  };
}

function parseChapter(raw: unknown, subjectIds: Set<string>, index: number): Chapter | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  const name = str(raw.name).trim();
  if (!subjectIds.has(subjectId) || !name) return null;
  return {
    id: str(raw.id) || uid('ch'),
    subjectId,
    code: str(raw.code).slice(0, 12),
    name: name.slice(0, 120),
    order: num(raw.order, index, 0, 10_000),
    source: source(raw.source),
  };
}

function parseTopic(
  raw: unknown,
  chapterIds: Map<string, string>,
  index: number,
): Topic | null {
  if (!isObj(raw)) return null;
  const chapterId = str(raw.chapterId);
  const name = str(raw.name).trim();
  const subjectId = chapterIds.get(chapterId);
  if (!subjectId || !name) return null;
  return {
    id: str(raw.id) || uid('top'),
    chapterId,
    subjectId,
    code: str(raw.code).slice(0, 12),
    name: name.slice(0, 160),
    order: num(raw.order, index, 0, 10_000),
    state: masteryState(raw.state),
    masteryPercent: numOrNull(raw.masteryPercent, 0, 100),
    confidence: numOrNull(raw.confidence, 1, 5),
    difficulty: Math.round(num(raw.difficulty, 2, 1, 3)),
    importance: Math.round(num(raw.importance, 2, 1, 3)),
    notes: str(raw.notes).slice(0, 2000),
    weakness: str(raw.weakness).slice(0, 500),
    lastStudied: dateOrNull(raw.lastStudied),
    lastRevised: dateOrNull(raw.lastRevised),
    nextRevision: dateOrNull(raw.nextRevision),
    revisionStage: Math.round(num(raw.revisionStage, 0, 0, 20)),
    source: source(raw.source),
  };
}

function parseTopicResults(raw: unknown, topicIds: Set<string>): AssessmentTopicResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!isObj(item)) return null;
      const topicId = str(item.topicId);
      if (!topicIds.has(topicId)) return null;
      const maxScore = num(item.maxScore, 100, 0.01, 1_000_000);
      return { topicId, score: num(item.score, 0, 0, 1_000_000), maxScore };
    })
    .filter((x): x is AssessmentTopicResult => x !== null);
}

function parseAssessment(
  raw: unknown,
  subjectIds: Set<string>,
  chapterIds: Map<string, string>,
  topicIds: Set<string>,
): Assessment | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  const chapterId = str(raw.chapterId);
  return {
    id: str(raw.id) || uid('asm'),
    subjectId,
    chapterId: chapterIds.has(chapterId) ? chapterId : null,
    name: (str(raw.name).trim() || 'Assessment').slice(0, 140),
    type: assessmentType(raw.type),
    date: dateOr(raw.date, todayISO()),
    score: num(raw.score, 0, 0, 1_000_000),
    maxScore: num(raw.maxScore, 100, 0.01, 1_000_000),
    note: str(raw.note).slice(0, 1000),
    topicResults: parseTopicResults(raw.topicResults, topicIds),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseSession(
  raw: unknown,
  subjectIds: Set<string>,
  topicIds: Set<string>,
): StudySession | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  const topicId = str(raw.topicId);
  return {
    id: str(raw.id) || uid('ses'),
    subjectId,
    topicId: topicIds.has(topicId) ? topicId : null,
    date: dateOr(raw.date, todayISO()),
    minutes: Math.round(num(raw.minutes, 0, 0, 24 * 60)),
    note: str(raw.note).slice(0, 1000),
    confidence: numOrNull(raw.confidence, 1, 5),
    understanding: understanding(raw.understanding),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parsePlanTask(
  raw: unknown,
  subjectIds: Set<string>,
  topicIds: Set<string>,
  index: number,
): PlanTask | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  const topicId = str(raw.topicId);
  const status = raw.status;
  return {
    id: str(raw.id) || uid('task'),
    date: dateOr(raw.date, todayISO()),
    subjectId,
    topicId: topicIds.has(topicId) ? topicId : null,
    minutes: Math.round(num(raw.minutes, 30, 5, 600)),
    at: /^\d{2}:\d{2}$/.test(str(raw.at)) ? str(raw.at) : '',
    status:
      status === 'done' || status === 'skipped' || status === 'snoozed' ? status : 'planned',
    fromEngine: raw.fromEngine !== false,
    reasons: Array.isArray(raw.reasons) ? raw.reasons.filter((r): r is string => typeof r === 'string').slice(0, 6) : [],
    order: num(raw.order, index, 0, 10_000),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseGoal(raw: unknown, subjectIds: Set<string>, examIds: Set<string>): Goal | null {
  if (!isObj(raw)) return null;
  const scope = raw.scope === 'overall' ? 'overall' : 'subject';
  const subjectId = scope === 'subject' ? str(raw.subjectId) : '';
  if (scope === 'subject' && !subjectIds.has(subjectId)) return null;

  // v1 goals used targetType rather than kind.
  const legacy = str(raw.targetType);
  const kind = raw.kind ? goalKind(raw.kind) : legacy === 'grade' ? 'grade' : 'percent';

  const targetPercent = numOrNull(raw.targetPercent, 0, 100);
  const targetGrade = gradeOrNull(raw.targetGrade);
  const targetMinutes = numOrNull(raw.targetMinutes, 0, 10_000);
  const examId = str(raw.examId);

  if (kind === 'grade' && targetGrade === null) return null;
  if ((kind === 'percent' || kind === 'syllabus') && targetPercent === null) return null;
  if (kind === 'study-time' && targetMinutes === null) return null;

  return {
    id: str(raw.id) || uid('goal'),
    scope,
    subjectId: scope === 'subject' ? subjectId : null,
    kind,
    targetPercent,
    targetGrade,
    targetMinutes,
    examId: examIds.has(examId) ? examId : null,
    deadline: isValidISODate(str(raw.deadline)) ? str(raw.deadline) : '',
    note: str(raw.note).slice(0, 500),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseExam(raw: unknown, subjectIds: Set<string>, topicIds: Set<string>): Exam | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  return {
    id: str(raw.id) || uid('exam'),
    subjectId,
    name: (str(raw.name).trim() || 'Exam').slice(0, 140),
    date: dateOr(raw.date, todayISO()),
    targetPercent: numOrNull(raw.targetPercent, 0, 100),
    targetGrade: gradeOrNull(raw.targetGrade),
    topicIds: Array.isArray(raw.topicIds)
      ? raw.topicIds.filter((id): id is string => typeof id === 'string' && topicIds.has(id))
      : [],
    note: str(raw.note).slice(0, 1000),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

/* -------------------------------- migration ------------------------------- */

/**
 * Version 1 stored `studyLogs` and goals with `targetType`. Everything else
 * lines up, so migration is mostly a rename plus the new empty collections.
 */
function migrateV1(source: Record<string, unknown>): Record<string, unknown> {
  const next = { ...source };
  if (!Array.isArray(next.studySessions) && Array.isArray(next.studyLogs)) {
    next.studySessions = next.studyLogs;
  }
  next.chapters = Array.isArray(next.chapters) ? next.chapters : [];
  next.topics = Array.isArray(next.topics) ? next.topics : [];
  next.exams = Array.isArray(next.exams) ? next.exams : [];
  next.planTasks = Array.isArray(next.planTasks) ? next.planTasks : [];
  return next;
}

export function normaliseData(raw: unknown): { data: AppData; report: ParseReport } {
  const base = emptyData();
  const report: ParseReport = {
    subjects: 0,
    chapters: 0,
    topics: 0,
    assessments: 0,
    studySessions: 0,
    goals: 0,
    exams: 0,
    planTasks: 0,
    dropped: 0,
    migratedFrom: null,
  };
  if (!isObj(raw)) return { data: base, report };

  let src = isObj(raw.data) ? (raw.data as Record<string, unknown>) : raw;
  const version = typeof src.version === 'number' ? src.version : 1;
  if (version < DATA_VERSION) {
    src = migrateV1(src);
    report.migratedFrom = version;
  }

  const subjects: Subject[] = [];
  for (const item of Array.isArray(src.subjects) ? src.subjects : []) {
    const parsed = parseSubject(item);
    if (parsed) subjects.push(parsed);
    else report.dropped += 1;
  }
  const subjectIds = new Set(subjects.map((s) => s.id));

  const chapters: Chapter[] = [];
  (Array.isArray(src.chapters) ? src.chapters : []).forEach((item, i) => {
    const parsed = parseChapter(item, subjectIds, i);
    if (parsed) chapters.push(parsed);
    else report.dropped += 1;
  });
  const chapterToSubject = new Map(chapters.map((c) => [c.id, c.subjectId]));

  const topics: Topic[] = [];
  (Array.isArray(src.topics) ? src.topics : []).forEach((item, i) => {
    const parsed = parseTopic(item, chapterToSubject, i);
    if (parsed) topics.push(parsed);
    else report.dropped += 1;
  });
  const topicIds = new Set(topics.map((t) => t.id));

  const exams: Exam[] = [];
  for (const item of Array.isArray(src.exams) ? src.exams : []) {
    const parsed = parseExam(item, subjectIds, topicIds);
    if (parsed) exams.push(parsed);
    else report.dropped += 1;
  }
  const examIds = new Set(exams.map((e) => e.id));

  const assessments: Assessment[] = [];
  for (const item of Array.isArray(src.assessments) ? src.assessments : []) {
    const parsed = parseAssessment(item, subjectIds, chapterToSubject, topicIds);
    if (parsed) assessments.push(parsed);
    else report.dropped += 1;
  }

  const studySessions: StudySession[] = [];
  for (const item of Array.isArray(src.studySessions) ? src.studySessions : []) {
    const parsed = parseSession(item, subjectIds, topicIds);
    if (parsed) studySessions.push(parsed);
    else report.dropped += 1;
  }

  const planTasks: PlanTask[] = [];
  (Array.isArray(src.planTasks) ? src.planTasks : []).forEach((item, i) => {
    const parsed = parsePlanTask(item, subjectIds, topicIds, i);
    if (parsed) planTasks.push(parsed);
    else report.dropped += 1;
  });

  const goals: Goal[] = [];
  for (const item of Array.isArray(src.goals) ? src.goals : []) {
    const parsed = parseGoal(item, subjectIds, examIds);
    if (parsed) goals.push(parsed);
    else report.dropped += 1;
  }

  const settingsRaw = isObj(src.settings) ? src.settings : {};
  const intervals = Array.isArray(settingsRaw.revisionIntervals)
    ? settingsRaw.revisionIntervals
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
        .map((n) => Math.round(clamp(n, 1, 365)))
    : [];

  report.subjects = subjects.length;
  report.chapters = chapters.length;
  report.topics = topics.length;
  report.assessments = assessments.length;
  report.studySessions = studySessions.length;
  report.goals = goals.length;
  report.exams = exams.length;
  report.planTasks = planTasks.length;

  return {
    data: {
      version: DATA_VERSION,
      subjects,
      chapters,
      topics,
      assessments,
      studySessions,
      planTasks,
      goals,
      exams,
      settings: {
        theme: theme(settingsRaw.theme),
        weekStartsOn: settingsRaw.weekStartsOn === 'sun' ? 'sun' : 'mon',
        gradeThresholds: parseThresholds(settingsRaw.gradeThresholds),
        defaultSessionMinutes: Math.round(num(settingsRaw.defaultSessionMinutes, 30, 5, 180)),
        dailyTargetMinutes: Math.round(num(settingsRaw.dailyTargetMinutes, 90, 0, 720)),
        weaknessBias: Math.round(num(settingsRaw.weaknessBias, 50, 0, 100)),
        examHorizonDays: Math.round(num(settingsRaw.examHorizonDays, 30, 1, 365)),
        revisionIntervals: intervals.length ? intervals : [...DEFAULT_INTERVALS],
        includeNotStarted: settingsRaw.includeNotStarted !== false,
      },
      dismissedNotices: Array.isArray(src.dismissedNotices)
        ? src.dismissedNotices.filter((n): n is string => typeof n === 'string')
        : [],
      updatedAt: str(src.updatedAt) || new Date().toISOString(),
    },
    report,
  };
}

/* --------------------------------- storage -------------------------------- */

function storageAvailable(): boolean {
  try {
    const probe = '__acc_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const canPersist = typeof window !== 'undefined' && storageAvailable();

/** Kept so a failed migration can be recovered by hand. */
export const BACKUP_KEY = 'acc.data.v1.backup';

export function loadData(): AppData {
  if (!canPersist) return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    const version = isObj(parsed) && typeof parsed.version === 'number' ? parsed.version : 1;
    // Keep the pre-migration document once, so nothing is lost irreversibly.
    if (version < DATA_VERSION && !window.localStorage.getItem(BACKUP_KEY)) {
      try {
        window.localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        /* a full quota should not block loading */
      }
    }
    return normaliseData(parsed).data;
  } catch (err) {
    console.warn('[storage] could not read saved data, starting fresh', err);
    return emptyData();
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveData(data: AppData): SaveResult {
  if (!canPersist) return { ok: false, error: 'This browser is blocking local storage.' };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'QuotaExceededError'
        ? 'Local storage is full — export your data and remove old entries.'
        : 'Could not save to local storage.';
    console.error('[storage] save failed', err);
    return { ok: false, error: message };
  }
}

export function clearData(): void {
  if (!canPersist) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('[storage] clear failed', err);
  }
}

/* ------------------------------ import / export --------------------------- */

export function serialiseExport(data: AppData): string {
  return JSON.stringify(
    { app: EXPORT_APP_ID, version: DATA_VERSION, exportedAt: new Date().toISOString(), data },
    null,
    2,
  );
}

export type ImportResult =
  | { ok: true; data: AppData; report: ParseReport }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!isObj(parsed)) return { ok: false, error: 'That file does not contain a backup.' };

  const looksLikeBackup =
    parsed.app === EXPORT_APP_ID || isObj(parsed.data) || Array.isArray(parsed.subjects);
  if (!looksLikeBackup) {
    return { ok: false, error: 'That file is not an Academic Command Center backup.' };
  }

  const { data, report } = normaliseData(parsed);
  return { ok: true, data, report };
}

export function exportFileName(): string {
  return `academic-command-center-${todayISO()}.json`;
}
