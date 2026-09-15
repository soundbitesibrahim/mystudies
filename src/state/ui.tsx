/** Which screen is showing, and the dialogs the quick actions open. */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Assessment, Exam, Goal, PlanTask, StudySession, Subject, Topic } from '../lib/types';

export type PageId =
  | 'overview'
  | 'focus'
  | 'subjects'
  | 'syllabus'
  | 'assessments'
  | 'study'
  | 'revision'
  | 'goals'
  | 'exams'
  | 'settings';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

interface DialogState {
  subject: { open: boolean; value: Subject | null };
  assessment: { open: boolean; value: Assessment | null; subjectId?: string };
  session: { open: boolean; value: StudySession | null; subjectId?: string; topicId?: string };
  goal: { open: boolean; value: Goal | null; subjectId?: string };
  exam: { open: boolean; value: Exam | null; subjectId?: string };
  topic: { open: boolean; topicId: string | null };
  task: { open: boolean; value: PlanTask | null };
  runner: { open: boolean; task: PlanTask | null; subjectId?: string; topicId?: string | null };
  scoreInfo: { open: boolean };
  search: { open: boolean };
  confirm: ConfirmRequest | null;
}

const initialDialogs: DialogState = {
  subject: { open: false, value: null },
  assessment: { open: false, value: null },
  session: { open: false, value: null },
  goal: { open: false, value: null },
  exam: { open: false, value: null },
  topic: { open: false, topicId: null },
  task: { open: false, value: null },
  runner: { open: false, task: null },
  scoreInfo: { open: false },
  search: { open: false },
  confirm: null,
};

interface UiValue {
  page: PageId;
  /** Set when a subject detail view is open. */
  subjectId: string | null;
  navigate: (page: PageId) => void;
  openSubjectDetail: (subjectId: string) => void;
  closeSubjectDetail: () => void;
  /** Pre-filters the syllabus page when navigating to it. */
  syllabusFilter: { subjectId: string | null; view: 'all' | 'weak' | 'not-started' | 'due' };
  setSyllabusFilter: (filter: Partial<UiValue['syllabusFilter']>) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  dialogs: DialogState;
  openSubject: (subject?: Subject | null) => void;
  openAssessment: (assessment?: Assessment | null, subjectId?: string) => void;
  openSession: (session?: StudySession | null, subjectId?: string, topicId?: string) => void;
  openGoal: (goal?: Goal | null, subjectId?: string) => void;
  openExam: (exam?: Exam | null, subjectId?: string) => void;
  openTopic: (topicId: string) => void;
  openTask: (task?: PlanTask | null) => void;
  openRunner: (task: PlanTask | null, subjectId?: string, topicId?: string | null) => void;
  openScoreInfo: () => void;
  openSearch: () => void;
  askConfirm: (request: ConfirmRequest) => void;
  closeDialog: (key: keyof DialogState) => void;
}

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>('overview');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syllabusFilter, setSyllabusFilterState] = useState<UiValue['syllabusFilter']>({
    subjectId: null,
    view: 'all',
  });
  const [dialogs, setDialogs] = useState<DialogState>(initialDialogs);

  const navigate = useCallback((next: PageId) => {
    setPage(next);
    setSubjectId(null);
    setMenuOpen(false);
  }, []);

  const setSyllabusFilter = useCallback((filter: Partial<UiValue['syllabusFilter']>) => {
    setSyllabusFilterState((current) => ({ ...current, ...filter }));
  }, []);

  const value = useMemo<UiValue>(
    () => ({
      page,
      subjectId,
      navigate,
      openSubjectDetail: (id) => {
        setPage('subjects');
        setSubjectId(id);
        setMenuOpen(false);
      },
      closeSubjectDetail: () => setSubjectId(null),
      syllabusFilter,
      setSyllabusFilter,
      menuOpen,
      setMenuOpen,
      dialogs,
      openSubject: (subject = null) =>
        setDialogs((d) => ({ ...d, subject: { open: true, value: subject } })),
      openAssessment: (assessment = null, sid) =>
        setDialogs((d) => ({ ...d, assessment: { open: true, value: assessment, subjectId: sid } })),
      openSession: (session = null, sid, tid) =>
        setDialogs((d) => ({ ...d, session: { open: true, value: session, subjectId: sid, topicId: tid } })),
      openGoal: (goal = null, sid) =>
        setDialogs((d) => ({ ...d, goal: { open: true, value: goal, subjectId: sid } })),
      openExam: (exam = null, sid) =>
        setDialogs((d) => ({ ...d, exam: { open: true, value: exam, subjectId: sid } })),
      openTopic: (topicId) => setDialogs((d) => ({ ...d, topic: { open: true, topicId } })),
      openTask: (task = null) => setDialogs((d) => ({ ...d, task: { open: true, value: task } })),
      openRunner: (task, sid, tid) =>
        setDialogs((d) => ({ ...d, runner: { open: true, task, subjectId: sid, topicId: tid } })),
      openScoreInfo: () => setDialogs((d) => ({ ...d, scoreInfo: { open: true } })),
      openSearch: () => setDialogs((d) => ({ ...d, search: { open: true } })),
      askConfirm: (request) => setDialogs((d) => ({ ...d, confirm: request })),
      closeDialog: (key) =>
        setDialogs((d) => {
          if (key === 'confirm') return { ...d, confirm: null };
          return { ...d, [key]: { ...(d[key] as object), open: false } } as DialogState;
        }),
    }),
    [page, subjectId, navigate, syllabusFilter, setSyllabusFilter, menuOpen, dialogs],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
