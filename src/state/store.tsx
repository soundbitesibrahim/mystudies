/**
 * Single source of truth. A reducer owns the data, an effect persists it,
 * and a memo derives every number the UI shows.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  AppData,
  Assessment,
  Goal,
  Settings,
  StudyLog,
  Subject,
} from '../lib/types';
import {
  clearData,
  emptyData,
  loadData,
  saveData,
} from '../lib/storage';
import { derive, type Derived } from './derived';
import { uid } from '../lib/utils';

type NewSubject = Omit<Subject, 'id' | 'createdAt' | 'updatedAt' | 'topics'>;
type NewAssessment = Omit<Assessment, 'id' | 'createdAt'>;
type NewStudyLog = Omit<StudyLog, 'id' | 'createdAt'>;
type NewGoal = Omit<Goal, 'id' | 'createdAt'>;

type Action =
  | { type: 'subject/add'; payload: NewSubject }
  | { type: 'subject/update'; id: string; payload: Partial<NewSubject> }
  | { type: 'subject/delete'; id: string }
  | { type: 'assessment/add'; payload: NewAssessment }
  | { type: 'assessment/update'; id: string; payload: Partial<NewAssessment> }
  | { type: 'assessment/delete'; id: string }
  | { type: 'log/add'; payload: NewStudyLog }
  | { type: 'log/update'; id: string; payload: Partial<NewStudyLog> }
  | { type: 'log/delete'; id: string }
  | { type: 'goal/add'; payload: NewGoal }
  | { type: 'goal/update'; id: string; payload: Partial<NewGoal> }
  | { type: 'goal/delete'; id: string }
  | { type: 'settings/update'; payload: Partial<Settings> }
  | { type: 'data/replace'; payload: AppData }
  | { type: 'data/reset' };

function touch(data: AppData): AppData {
  return { ...data, updatedAt: new Date().toISOString() };
}

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'subject/add': {
      const now = new Date().toISOString();
      const subject: Subject = {
        ...action.payload,
        id: uid('sub'),
        topics: [],
        createdAt: now,
        updatedAt: now,
      };
      return touch({ ...state, subjects: [...state.subjects, subject] });
    }
    case 'subject/update':
      return touch({
        ...state,
        subjects: state.subjects.map((s) =>
          s.id === action.id ? { ...s, ...action.payload, updatedAt: new Date().toISOString() } : s,
        ),
      });
    case 'subject/delete':
      // Deleting a subject removes everything that only made sense with it.
      return touch({
        ...state,
        subjects: state.subjects.filter((s) => s.id !== action.id),
        assessments: state.assessments.filter((a) => a.subjectId !== action.id),
        studyLogs: state.studyLogs.filter((l) => l.subjectId !== action.id),
        goals: state.goals.filter((g) => g.subjectId !== action.id),
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
        assessments: state.assessments.map((a) =>
          a.id === action.id ? { ...a, ...action.payload } : a,
        ),
      });
    case 'assessment/delete':
      return touch({ ...state, assessments: state.assessments.filter((a) => a.id !== action.id) });

    case 'log/add':
      return touch({
        ...state,
        studyLogs: [
          ...state.studyLogs,
          { ...action.payload, id: uid('log'), createdAt: new Date().toISOString() },
        ],
      });
    case 'log/update':
      return touch({
        ...state,
        studyLogs: state.studyLogs.map((l) => (l.id === action.id ? { ...l, ...action.payload } : l)),
      });
    case 'log/delete':
      return touch({ ...state, studyLogs: state.studyLogs.filter((l) => l.id !== action.id) });

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

    case 'settings/update':
      return touch({ ...state, settings: { ...state.settings, ...action.payload } });

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
    addSubject: (input: NewSubject) => void;
    updateSubject: (id: string, input: Partial<NewSubject>) => void;
    deleteSubject: (id: string) => void;
    addAssessment: (input: NewAssessment) => void;
    updateAssessment: (id: string, input: Partial<NewAssessment>) => void;
    deleteAssessment: (id: string) => void;
    addLog: (input: NewStudyLog) => void;
    updateLog: (id: string, input: Partial<NewStudyLog>) => void;
    deleteLog: (id: string) => void;
    addGoal: (input: NewGoal) => void;
    updateGoal: (id: string, input: Partial<NewGoal>) => void;
    deleteGoal: (id: string) => void;
    updateSettings: (input: Partial<Settings>) => void;
    replaceData: (data: AppData) => void;
    resetData: () => void;
  };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData);
  const [saveError, setSaveError] = useState<string | null>(null);
  const firstRun = useRef(true);

  // Persist on every change. The first pass is the load itself, so skip it.
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
      addSubject: (payload) => dispatch({ type: 'subject/add', payload }),
      updateSubject: (id, payload) => dispatch({ type: 'subject/update', id, payload }),
      deleteSubject: (id) => dispatch({ type: 'subject/delete', id }),
      addAssessment: (payload) => dispatch({ type: 'assessment/add', payload }),
      updateAssessment: (id, payload) => dispatch({ type: 'assessment/update', id, payload }),
      deleteAssessment: (id) => dispatch({ type: 'assessment/delete', id }),
      addLog: (payload) => dispatch({ type: 'log/add', payload }),
      updateLog: (id, payload) => dispatch({ type: 'log/update', id, payload }),
      deleteLog: (id) => dispatch({ type: 'log/delete', id }),
      addGoal: (payload) => dispatch({ type: 'goal/add', payload }),
      updateGoal: (id, payload) => dispatch({ type: 'goal/update', id, payload }),
      deleteGoal: (id) => dispatch({ type: 'goal/delete', id }),
      updateSettings: (payload) => dispatch({ type: 'settings/update', payload }),
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

export function useData(): AppData {
  return useStore().data;
}

export function useDerived(): Derived {
  return useStore().derived;
}

export function useActions(): StoreValue['actions'] {
  return useStore().actions;
}

/** Convenience for forms that need the subject list. */
export function useSubjects(): Subject[] {
  return useStore().data.subjects;
}

export type { NewAssessment, NewGoal, NewStudyLog, NewSubject };
