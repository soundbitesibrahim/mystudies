/**
 * Single source of truth. A reducer owns the data, an effect persists it, and
 * a memo derives every number the UI shows.
 */

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type {
  AppData,
  Assessment,
  Chapter,
  Exam,
  Goal,
  PlanTask,
  Settings,
  StudySession,
  Subject,
  Topic,
} from '../lib/types';
import { clearData, emptyData, loadData, saveData } from '../lib/storage';
import { outcomeFromFeedback, scheduleNextReview } from '../lib/revision';
import { SYLLABUS_SEED, type SeedSubject } from '../data/syllabus';
import { derive, type Derived } from './derived';
import { todayISO, uid } from '../lib/utils';

type NewSubject = Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>;
type NewAssessment = Omit<Assessment, 'id' | 'createdAt'>;
type NewSession = Omit<StudySession, 'id' | 'createdAt'>;
type NewGoal = Omit<Goal, 'id' | 'createdAt'>;
type NewExam = Omit<Exam, 'id' | 'createdAt'>;
type NewChapter = Omit<Chapter, 'id' | 'createdAt' | 'source'> & { source?: Chapter['source'] };
type NewTopicInput = {
  chapterId: string;
  subjectId: string;
  name: string;
  code?: string;
};
type NewPlanTask = Omit<PlanTask, 'id' | 'createdAt' | 'order'> & { order?: number };

type Action =
  | { type: 'subject/add'; payload: NewSubject; seed?: SeedSubject | null }
  | { type: 'subject/update'; id: string; payload: Partial<NewSubject> }
  | { type: 'subject/delete'; id: string }
  | { type: 'subject/applySeed'; id: string; seed: SeedSubject }
  | { type: 'chapter/add'; payload: NewChapter }
  | { type: 'chapter/update'; id: string; payload: Partial<Chapter> }
  | { type: 'chapter/delete'; id: string }
  | { type: 'topic/add'; payload: NewTopicInput }
  | { type: 'topic/update'; id: string; payload: Partial<Topic> }
  | { type: 'topic/delete'; id: string }
  | { type: 'assessment/add'; payload: NewAssessment }
  | { type: 'assessment/update'; id: string; payload: Partial<NewAssessment> }
  | { type: 'assessment/delete'; id: string }
  | { type: 'session/add'; payload: NewSession }
  | { type: 'session/update'; id: string; payload: Partial<NewSession> }
  | { type: 'session/delete'; id: string }
  | { type: 'task/add'; payload: NewPlanTask }
  | { type: 'task/update'; id: string; payload: Partial<PlanTask> }
  | { type: 'task/delete'; id: string }
  | { type: 'task/reorder'; id: string; direction: -1 | 1 }
  | { type: 'goal/add'; payload: NewGoal }
  | { type: 'goal/update'; id: string; payload: Partial<NewGoal> }
  | { type: 'goal/delete'; id: string }
  | { type: 'exam/add'; payload: NewExam }
  | { type: 'exam/update'; id: string; payload: Partial<NewExam> }
  | { type: 'exam/delete'; id: string }
  | { type: 'settings/update'; payload: Partial<Settings> }
  | { type: 'notice/dismiss'; id: string }
  | { type: 'data/replace'; payload: AppData }
  | { type: 'data/reset' };

const touch = (data: AppData): AppData => ({ ...data, updatedAt: new Date().toISOString() });

/** Expands a syllabus seed into chapters and topics for one subject. */
function seedSyllabus(
  subjectId: string,
  seed: SeedSubject,
): { chapters: Chapter[]; topics: Topic[] } {
  const chapters: Chapter[] = [];
  const topics: Topic[] = [];
  seed.chapters.forEach((chapter, ci) => {
    const chapterId = uid('ch');
    chapters.push({
      id: chapterId,
      subjectId,
      code: chapter.code,
      name: chapter.name,
      order: ci,
      source: 'seed',
    });
    chapter.topics.forEach((topic, ti) => {
      topics.push({
        id: uid('top'),
        chapterId,
        subjectId,
        code: topic.code,
        name: topic.name,
        order: ti,
        state: 'not-started',
        masteryPercent: null,
        confidence: null,
        difficulty: 2,
        importance: 2,
        notes: '',
        weakness: '',
        lastStudied: null,
        lastRevised: null,
        nextRevision: null,
        revisionStage: 0,
        source: 'seed',
      });
    });
  });
  return { chapters, topics };
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'subject/add': {
      const now = new Date().toISOString();
      const subject: Subject = { ...action.payload, id: uid('sub'), createdAt: now, updatedAt: now };
      const seeded = action.seed ? seedSyllabus(subject.id, action.seed) : { chapters: [], topics: [] };
      return touch({
        ...state,
        subjects: [...state.subjects, subject],
        chapters: [...state.chapters, ...seeded.chapters],
        topics: [...state.topics, ...seeded.topics],
      });
    }
    case 'subject/update':
      return touch({
        ...state,
        subjects: state.subjects.map((s) =>
          s.id === action.id ? { ...s, ...action.payload, updatedAt: new Date().toISOString() } : s,
        ),
      });
    case 'subject/delete': {
      const chapterIds = new Set(
        state.chapters.filter((c) => c.subjectId === action.id).map((c) => c.id),
      );
      return touch({
        ...state,
        subjects: state.subjects.filter((s) => s.id !== action.id),
        chapters: state.chapters.filter((c) => c.subjectId !== action.id),
        topics: state.topics.filter((t) => !chapterIds.has(t.chapterId)),
        assessments: state.assessments.filter((a) => a.subjectId !== action.id),
        studySessions: state.studySessions.filter((s) => s.subjectId !== action.id),
        planTasks: state.planTasks.filter((t) => t.subjectId !== action.id),
        goals: state.goals.filter((g) => g.subjectId !== action.id),
        exams: state.exams.filter((e) => e.subjectId !== action.id),
      });
    }
    case 'subject/applySeed': {
      // Only fills a subject that has no syllabus yet — never overwrites edits.
      if (state.chapters.some((c) => c.subjectId === action.id)) return state;
      const seeded = seedSyllabus(action.id, action.seed);
      return touch({
        ...state,
        chapters: [...state.chapters, ...seeded.chapters],
        topics: [...state.topics, ...seeded.topics],
      });
    }

    case 'chapter/add': {
      const order =
        action.payload.order ??
        state.chapters.filter((c) => c.subjectId === action.payload.subjectId).length;
      return touch({
        ...state,
        chapters: [
          ...state.chapters,
          { ...action.payload, order, source: action.payload.source ?? 'user', id: uid('ch') },
        ],
      });
    }
    case 'chapter/update':
      return touch({
        ...state,
        chapters: state.chapters.map((c) => (c.id === action.id ? { ...c, ...action.payload } : c)),
      });
    case 'chapter/delete':
      return touch({
        ...state,
        chapters: state.chapters.filter((c) => c.id !== action.id),
        topics: state.topics.filter((t) => t.chapterId !== action.id),
      });

    case 'topic/add': {
      const order = state.topics.filter((t) => t.chapterId === action.payload.chapterId).length;
      const topic: Topic = {
        id: uid('top'),
        chapterId: action.payload.chapterId,
        subjectId: action.payload.subjectId,
        code: action.payload.code ?? '',
        name: action.payload.name,
        order,
        state: 'not-started',
        masteryPercent: null,
        confidence: null,
        difficulty: 2,
        importance: 2,
        notes: '',
        weakness: '',
        lastStudied: null,
        lastRevised: null,
        nextRevision: null,
        revisionStage: 0,
        source: 'user',
      };
      return touch({ ...state, topics: [...state.topics, topic] });
    }
    case 'topic/update':
      return touch({
        ...state,
        topics: state.topics.map((t) => (t.id === action.id ? { ...t, ...action.payload } : t)),
      });
    case 'topic/delete':
      return touch({
        ...state,
        topics: state.topics.filter((t) => t.id !== action.id),
        assessments: state.assessments.map((a) => ({
          ...a,
          topicResults: a.topicResults.filter((r) => r.topicId !== action.id),
        })),
        studySessions: state.studySessions.map((s) =>
          s.topicId === action.id ? { ...s, topicId: null } : s,
        ),
        planTasks: state.planTasks.filter((t) => t.topicId !== action.id),
        exams: state.exams.map((e) => ({
          ...e,
          topicIds: e.topicIds.filter((id) => id !== action.id),
        })),
      });

    case 'assessment/add':
      return touch({
        ...state,
        assessments: [
          ...state.assessments,
          { ...action.payload, id: uid('asm'), createdAt: new Date().toISOString() },
        ],
      });
    case 'assessment/update':
      return touch({
        ...state,
        assessments: state.assessments.map((a) => (a.id === action.id ? { ...a, ...action.payload } : a)),
      });
    case 'assessment/delete':
      return touch({ ...state, assessments: state.assessments.filter((a) => a.id !== action.id) });

    case 'session/add': {
      const session: StudySession = {
        ...action.payload,
        id: uid('ses'),
        createdAt: new Date().toISOString(),
      };
      // Studying a topic updates when it was last touched and reschedules review.
      const topics = session.topicId
        ? state.topics.map((t) => {
            if (t.id !== session.topicId) return t;
            const review = scheduleNextReview(
              t,
              state.settings,
              outcomeFromFeedback(session.confidence, session.understanding),
            );
            return {
              ...t,
              lastStudied: session.date,
              ...review,
              state: t.state === 'not-started' ? ('learning' as const) : t.state,
              confidence: session.confidence ?? t.confidence,
            };
          })
        : state.topics;
      return touch({ ...state, studySessions: [...state.studySessions, session], topics });
    }
    case 'session/update':
      return touch({
        ...state,
        studySessions: state.studySessions.map((s) =>
          s.id === action.id ? { ...s, ...action.payload } : s,
        ),
      });
    case 'session/delete':
      return touch({
        ...state,
        studySessions: state.studySessions.filter((s) => s.id !== action.id),
      });

    case 'task/add': {
      const order =
        action.payload.order ?? state.planTasks.filter((t) => t.date === action.payload.date).length;
      return touch({
        ...state,
        planTasks: [
          ...state.planTasks,
          { ...action.payload, order, id: uid('task'), createdAt: new Date().toISOString() },
        ],
      });
    }
    case 'task/update':
      return touch({
        ...state,
        planTasks: state.planTasks.map((t) => (t.id === action.id ? { ...t, ...action.payload } : t)),
      });
    case 'task/delete':
      return touch({ ...state, planTasks: state.planTasks.filter((t) => t.id !== action.id) });
    case 'task/reorder': {
      const task = state.planTasks.find((t) => t.id === action.id);
      if (!task) return state;
      const sameDay = state.planTasks
        .filter((t) => t.date === task.date)
        .sort((a, b) => a.order - b.order);
      const index = sameDay.findIndex((t) => t.id === action.id);
      const target = index + action.direction;
      if (target < 0 || target >= sameDay.length) return state;
      const reordered = [...sameDay];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const orderById = new Map(reordered.map((t, i) => [t.id, i]));
      return touch({
        ...state,
        planTasks: state.planTasks.map((t) =>
          orderById.has(t.id) ? { ...t, order: orderById.get(t.id) as number } : t,
        ),
      });
    }

    case 'goal/add':
      return touch({
        ...state,
        goals: [...state.goals, { ...action.payload, id: uid('goal'), createdAt: new Date().toISOString() }],
      });
    case 'goal/update':
      return touch({
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.payload } : g)),
      });
    case 'goal/delete':
      return touch({ ...state, goals: state.goals.filter((g) => g.id !== action.id) });

    case 'exam/add':
      return touch({
        ...state,
        exams: [...state.exams, { ...action.payload, id: uid('exam'), createdAt: new Date().toISOString() }],
      });
    case 'exam/update':
      return touch({
        ...state,
        exams: state.exams.map((e) => (e.id === action.id ? { ...e, ...action.payload } : e)),
      });
    case 'exam/delete':
      return touch({
        ...state,
        exams: state.exams.filter((e) => e.id !== action.id),
        goals: state.goals.map((g) => (g.examId === action.id ? { ...g, examId: null } : g)),
      });

    case 'settings/update':
      return touch({ ...state, settings: { ...state.settings, ...action.payload } });
    case 'notice/dismiss':
      return touch({
        ...state,
        dismissedNotices: state.dismissedNotices.includes(action.id)
          ? state.dismissedNotices
          : [...state.dismissedNotices, action.id],
      });

    case 'data/replace':
      return touch({ ...action.payload });
    case 'data/reset':
      return emptyData();
    default:
      return state;
  }
}

interface StoreValue {
  data: AppData;
  derived: Derived;
  saveError: string | null;
  actions: {
    addSubject: (input: NewSubject, seed?: SeedSubject | null) => void;
    updateSubject: (id: string, input: Partial<NewSubject>) => void;
    deleteSubject: (id: string) => void;
    applySeed: (id: string, seed: SeedSubject) => void;
    addChapter: (input: NewChapter) => void;
    updateChapter: (id: string, input: Partial<Chapter>) => void;
    deleteChapter: (id: string) => void;
    addTopic: (input: NewTopicInput) => void;
    updateTopic: (id: string, input: Partial<Topic>) => void;
    deleteTopic: (id: string) => void;
    addAssessment: (input: NewAssessment) => void;
    updateAssessment: (id: string, input: Partial<NewAssessment>) => void;
    deleteAssessment: (id: string) => void;
    addSession: (input: NewSession) => void;
    updateSession: (id: string, input: Partial<NewSession>) => void;
    deleteSession: (id: string) => void;
    addTask: (input: NewPlanTask) => void;
    updateTask: (id: string, input: Partial<PlanTask>) => void;
    deleteTask: (id: string) => void;
    moveTask: (id: string, direction: -1 | 1) => void;
    addGoal: (input: NewGoal) => void;
    updateGoal: (id: string, input: Partial<NewGoal>) => void;
    deleteGoal: (id: string) => void;
    addExam: (input: NewExam) => void;
    updateExam: (id: string, input: Partial<NewExam>) => void;
    deleteExam: (id: string) => void;
    updateSettings: (input: Partial<Settings>) => void;
    dismissNotice: (id: string) => void;
    replaceData: (data: AppData) => void;
    resetData: () => void;
  };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const result = saveData(data);
    setSaveError(result.ok ? null : result.error);
  }, [data]);

  const derived = useMemo(() => derive(data), [data]);

  const actions = useMemo<StoreValue['actions']>(
    () => ({
      addSubject: (payload, seed = null) => dispatch({ type: 'subject/add', payload, seed }),
      updateSubject: (id, payload) => dispatch({ type: 'subject/update', id, payload }),
      deleteSubject: (id) => dispatch({ type: 'subject/delete', id }),
      applySeed: (id, seed) => dispatch({ type: 'subject/applySeed', id, seed }),
      addChapter: (payload) => dispatch({ type: 'chapter/add', payload }),
      updateChapter: (id, payload) => dispatch({ type: 'chapter/update', id, payload }),
      deleteChapter: (id) => dispatch({ type: 'chapter/delete', id }),
      addTopic: (payload) => dispatch({ type: 'topic/add', payload }),
      updateTopic: (id, payload) => dispatch({ type: 'topic/update', id, payload }),
      deleteTopic: (id) => dispatch({ type: 'topic/delete', id }),
      addAssessment: (payload) => dispatch({ type: 'assessment/add', payload }),
      updateAssessment: (id, payload) => dispatch({ type: 'assessment/update', id, payload }),
      deleteAssessment: (id) => dispatch({ type: 'assessment/delete', id }),
      addSession: (payload) => dispatch({ type: 'session/add', payload }),
      updateSession: (id, payload) => dispatch({ type: 'session/update', id, payload }),
      deleteSession: (id) => dispatch({ type: 'session/delete', id }),
      addTask: (payload) => dispatch({ type: 'task/add', payload }),
      updateTask: (id, payload) => dispatch({ type: 'task/update', id, payload }),
      deleteTask: (id) => dispatch({ type: 'task/delete', id }),
      moveTask: (id, direction) => dispatch({ type: 'task/reorder', id, direction }),
      addGoal: (payload) => dispatch({ type: 'goal/add', payload }),
      updateGoal: (id, payload) => dispatch({ type: 'goal/update', id, payload }),
      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),
      addExam: (payload) => dispatch({ type: 'exam/add', payload }),
      updateExam: (id, payload) => dispatch({ type: 'exam/update', id, payload }),
      deleteExam: (id) => dispatch({ type: 'exam/delete', id }),
      updateSettings: (payload) => dispatch({ type: 'settings/update', payload }),
      dismissNotice: (id) => dispatch({ type: 'notice/dismiss', id }),
      replaceData: (payload) => dispatch({ type: 'data/replace', payload }),
      resetData: () => {
        clearData();
        dispatch({ type: 'data/reset' });
      },
    }),
    [],
  );

  const value = useMemo<StoreValue>(
    () => ({ data, derived, saveError, actions }),
    [data, derived, saveError, actions],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export const useData = (): AppData => useStore().data;
export const useDerived = (): Derived => useStore().derived;
export const useActions = (): StoreValue['actions'] => useStore().actions;
export const useSubjects = (): Subject[] => useStore().data.subjects;
export const useSettings = (): Settings => useStore().data.settings;

/** Default subjects offered on first run — editable, never forced. */
export const DEFAULT_SUBJECTS = SYLLABUS_SEED.map((s) => ({ name: s.name, code: s.code }));

export { todayISO };
export type { NewAssessment, NewExam, NewGoal, NewSession, NewSubject, NewPlanTask };
