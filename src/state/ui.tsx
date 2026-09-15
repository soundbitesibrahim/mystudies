/**
 * UI-level state: which page is showing, and the global dialogs that the
 * quick actions open from anywhere in the app.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Assessment, Goal, StudyLog, Subject } from '../lib/types';

export type PageId =
  | 'overview'
  | 'focus'
  | 'subjects'
  | 'assessments'
  | 'study'
  | 'goals'
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
  log: { open: boolean; value: StudyLog | null; subjectId?: string };
  goal: { open: boolean; value: Goal | null; subjectId?: string };
  confirm: ConfirmRequest | null;
}

interface UiValue {
  page: PageId;
  navigate: (page: PageId) => void;
  dialogs: DialogState;
  openSubject: (subject?: Subject | null) => void;
  openAssessment: (assessment?: Assessment | null, subjectId?: string) => void;
  openLog: (log?: StudyLog | null, subjectId?: string) => void;
  openGoal: (goal?: Goal | null, subjectId?: string) => void;
  askConfirm: (request: ConfirmRequest) => void;
  closeDialog: (key: keyof DialogState) => void;
}

const initialDialogs: DialogState = {
  subject: { open: false, value: null },
  assessment: { open: false, value: null },
  log: { open: false, value: null },
  goal: { open: false, value: null },
  confirm: null,
};

const UiContext = createContext<UiValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageId>('overview');
  const [dialogs, setDialogs] = useState<DialogState>(initialDialogs);

  const navigate = useCallback((next: PageId) => {
    setPage(next);
  }, []);

  const value = useMemo<UiValue>(
    () => ({
      page,
      navigate,
      dialogs,
      openSubject: (subject = null) =>
        setDialogs((d) => ({ ...d, subject: { open: true, value: subject } })),
      openAssessment: (assessment = null, subjectId) =>
        setDialogs((d) => ({ ...d, assessment: { open: true, value: assessment, subjectId } })),
      openLog: (log = null, subjectId) =>
        setDialogs((d) => ({ ...d, log: { open: true, value: log, subjectId } })),
      openGoal: (goal = null, subjectId) =>
        setDialogs((d) => ({ ...d, goal: { open: true, value: goal, subjectId } })),
      askConfirm: (request) => setDialogs((d) => ({ ...d, confirm: request })),
      closeDialog: (key) =>
        setDialogs((d) => {
          if (key === 'confirm') return { ...d, confirm: null };
          return { ...d, [key]: { ...d[key], open: false } } as DialogState;
        }),
    }),
    [page, navigate, dialogs],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
