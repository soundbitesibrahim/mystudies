/**
 * Local-first persistence.
 *
 * Everything lives in one versioned JSON blob in localStorage, which survives
 * refreshes, tab closes and browser restarts. Import/export use the same
 * validated shape, so a backup can always be restored — and the whole layer is
 * behind this module so a sync backend could replace it later.
 */

import type {
  AppData,
  Assessment,
  Goal,
  Grade,
  PriorityLevel,
  Settings,
  StudyLog,
  Subject,
  ThemePreference,
} from './types';
import { isGrade } from './grades';
import { clamp, isValidISODate, todayISO, uid } from './utils';

export const STORAGE_KEY = 'acc.data';
export const DATA_VERSION = 1;
export const EXPORT_APP_ID = 'academic-command-center';

export const DEFAULT_SETTINGS: Settings = { theme: 'dark', weekStartsOn: 'mon' };

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    subjects: [],
    assessments: [],
    studyLogs: [],
    goals: [],
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: new Date().toISOString(),
  };
}

/* --------------------------------- helpers -------------------------------- */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function numOrNull(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return clamp(v, min, max);
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

function gradeOrNull(v: unknown): Grade | null {
  return isGrade(v) ? v : null;
}

function dateOr(v: unknown, fallback: string): string {
  const s = str(v);
  return isValidISODate(s) ? s : fallback;
}

function priorityOverride(v: unknown): PriorityLevel | null {
  return v === 'high' || v === 'medium' || v === 'maintain' ? v : null;
}

function theme(v: unknown): ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system' ? v : DEFAULT_SETTINGS.theme;
}

/* -------------------------------- validation ------------------------------ */

export interface ParseReport {
  subjects: number;
  assessments: number;
  studyLogs: number;
  goals: number;
  dropped: number;
}

function parseSubject(raw: unknown): Subject | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name).trim();
  if (!name) return null;
  const now = new Date().toISOString();
  return {
    id: str(raw.id) || uid('sub'),
    name: name.slice(0, 80),
    rating: numOrNull(raw.rating, 0, 100),
    currentPercent: numOrNull(raw.currentPercent, 0, 100),
    currentGrade: gradeOrNull(raw.currentGrade),
    targetPercent: numOrNull(raw.targetPercent, 0, 100),
    targetGrade: gradeOrNull(raw.targetGrade),
    weakness: str(raw.weakness).slice(0, 400),
    priorityOverride: priorityOverride(raw.priorityOverride),
    topics: Array.isArray(raw.topics) ? [] : [],
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
  };
}

function parseAssessment(raw: unknown, subjectIds: Set<string>): Assessment | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  const maxScore = num(raw.maxScore, 100, 0.01, 1_000_000);
  return {
    id: str(raw.id) || uid('asm'),
    subjectId,
    name: (str(raw.name).trim() || 'Assessment').slice(0, 120),
    date: dateOr(raw.date, todayISO()),
    score: num(raw.score, 0, 0, 1_000_000),
    maxScore,
    note: str(raw.note).slice(0, 400),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseStudyLog(raw: unknown, subjectIds: Set<string>): StudyLog | null {
  if (!isObj(raw)) return null;
  const subjectId = str(raw.subjectId);
  if (!subjectIds.has(subjectId)) return null;
  return {
    id: str(raw.id) || uid('log'),
    subjectId,
    date: dateOr(raw.date, todayISO()),
    minutes: Math.round(num(raw.minutes, 0, 0, 24 * 60)),
    note: str(raw.note).slice(0, 400),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

function parseGoal(raw: unknown, subjectIds: Set<string>): Goal | null {
  if (!isObj(raw)) return null;
  const scope = raw.scope === 'overall' ? 'overall' : 'subject';
  const subjectId = scope === 'subject' ? str(raw.subjectId) : '';
  if (scope === 'subject' && !subjectIds.has(subjectId)) return null;
  const targetType = raw.targetType === 'grade' ? 'grade' : 'percent';
  const targetPercent = numOrNull(raw.targetPercent, 0, 100);
  const targetGrade = gradeOrNull(raw.targetGrade);
  if (targetType === 'percent' && targetPercent === null) return null;
  if (targetType === 'grade' && targetGrade === null) return null;
  const deadline = str(raw.deadline);
  return {
    id: str(raw.id) || uid('goal'),
    scope,
    subjectId: scope === 'subject' ? subjectId : null,
    targetType,
    targetPercent,
    targetGrade,
    deadline: isValidISODate(deadline) ? deadline : '',
    note: str(raw.note).slice(0, 400),
    createdAt: str(raw.createdAt) || new Date().toISOString(),
  };
}

/**
 * Turns arbitrary parsed JSON into valid AppData, dropping anything unusable
 * instead of throwing. Used for both stored state and imported files.
 */
export function normaliseData(raw: unknown): { data: AppData; report: ParseReport } {
  const base = emptyData();
  const report: ParseReport = { subjects: 0, assessments: 0, studyLogs: 0, goals: 0, dropped: 0 };
  if (!isObj(raw)) return { data: base, report };

  const source = isObj(raw.data) ? (raw.data as Record<string, unknown>) : raw;

  const subjects: Subject[] = [];
  if (Array.isArray(source.subjects)) {
    for (const item of source.subjects) {
      const parsed = parseSubject(item);
      if (parsed) subjects.push(parsed);
      else report.dropped += 1;
    }
  }
  const subjectIds = new Set(subjects.map((s) => s.id));

  const assessments: Assessment[] = [];
  if (Array.isArray(source.assessments)) {
    for (const item of source.assessments) {
      const parsed = parseAssessment(item, subjectIds);
      if (parsed) assessments.push(parsed);
      else report.dropped += 1;
    }
  }

  const studyLogs: StudyLog[] = [];
  if (Array.isArray(source.studyLogs)) {
    for (const item of source.studyLogs) {
      const parsed = parseStudyLog(item, subjectIds);
      if (parsed) studyLogs.push(parsed);
      else report.dropped += 1;
    }
  }

  const goals: Goal[] = [];
  if (Array.isArray(source.goals)) {
    for (const item of source.goals) {
      const parsed = parseGoal(item, subjectIds);
      if (parsed) goals.push(parsed);
      else report.dropped += 1;
    }
  }

  const settingsRaw = isObj(source.settings) ? source.settings : {};

  report.subjects = subjects.length;
  report.assessments = assessments.length;
  report.studyLogs = studyLogs.length;
  report.goals = goals.length;

  return {
    data: {
      version: DATA_VERSION,
      subjects,
      assessments,
      studyLogs,
      goals,
      settings: {
        theme: theme(settingsRaw.theme),
        weekStartsOn: settingsRaw.weekStartsOn === 'sun' ? 'sun' : 'mon',
      },
      updatedAt: str(source.updatedAt) || new Date().toISOString(),
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

export function loadData(): AppData {
  if (!canPersist) return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normaliseData(JSON.parse(raw)).data;
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
    {
      app: EXPORT_APP_ID,
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    },
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
    parsed.app === EXPORT_APP_ID ||
    isObj(parsed.data) ||
    Array.isArray((parsed as Record<string, unknown>).subjects);
  if (!looksLikeBackup) {
    return { ok: false, error: 'That file is not an Academic Command Center backup.' };
  }

  const { data, report } = normaliseData(parsed);
  return { ok: true, data, report };
}

export function exportFileName(): string {
  return `academic-command-center-${todayISO()}.json`;
}
