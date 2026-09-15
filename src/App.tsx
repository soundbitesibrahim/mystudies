/** App shell: navigation, animated page transitions and the global dialogs. */

import React, { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './state/store';
import { UiProvider, useUi, type PageId } from './state/ui';
import { useAppliedTheme } from './state/theme';
import { ToastProvider } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { Button } from './components/ui/Button';
import { SubjectForm } from './components/forms/SubjectForm';
import { AssessmentForm } from './components/forms/AssessmentForm';
import { StudyLogForm } from './components/forms/StudyLogForm';
import { GoalForm } from './components/forms/GoalForm';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OverviewPage } from './pages/Overview';
import { FocusPage } from './pages/Focus';
import { SubjectsPage } from './pages/Subjects';
import { AssessmentsPage } from './pages/Assessments';
import { StudyTimePage } from './pages/StudyTime';
import { GoalsPage } from './pages/Goals';
import { SettingsPage } from './pages/Settings';

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'How am I doing?' },
  focus: { title: 'My Focus', subtitle: 'What needs me most?' },
  subjects: { title: 'Subjects', subtitle: 'Ratings, performance and targets' },
  assessments: { title: 'Assessments', subtitle: 'Test and exam results' },
  study: { title: 'Study Time', subtitle: 'Weekly totals and distribution' },
  goals: { title: 'Goals', subtitle: 'Targets and the gap to them' },
  settings: { title: 'Settings', subtitle: 'Theme, subjects and your data' },
};

const PAGES: Record<PageId, React.ComponentType> = {
  overview: OverviewPage,
  focus: FocusPage,
  subjects: SubjectsPage,
  assessments: AssessmentsPage,
  study: StudyTimePage,
  goals: GoalsPage,
  settings: SettingsPage,
};

const EXIT_MS = 130;

/** Holds the outgoing page briefly so it can animate out before the new one enters. */
function PageOutlet() {
  const { page } = useUi();
  const [rendered, setRendered] = useState<PageId>(page);
  const [leaving, setLeaving] = useState(false);
  const pending = useRef<PageId>(page);

  useEffect(() => {
    if (page === rendered) return;
    pending.current = page;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setRendered(pending.current);
      setLeaving(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [page, rendered]);

  const Component = PAGES[rendered];

  return (
    <div className={leaving ? 'page-transition--leaving' : undefined} key={rendered}>
      <Component />
    </div>
  );
}

function Topbar() {
  const { page, openSubject, openAssessment, openLog, openGoal } = useUi();
  const meta = PAGE_META[page];
  const { data } = useStore();
  const hasSubjects = data.subjects.length > 0;

  return (
    <header className="topbar">
      <div className="topbar__title" key={page}>
        <h1 className="enter-down">{meta.title}</h1>
        <p className="enter-down">{meta.subtitle}</p>
      </div>
      <div className="topbar__actions">
        <Button size="sm" icon="clipboard" disabled={!hasSubjects} onClick={() => openAssessment()}>
          Assessment
        </Button>
        <Button size="sm" icon="clock" disabled={!hasSubjects} onClick={() => openLog()}>
          Study time
        </Button>
        <Button size="sm" icon="flag" onClick={() => openGoal()}>
          Goal
        </Button>
        <Button size="sm" variant="primary" icon="plus" onClick={() => openSubject()}>
          Subject
        </Button>
      </div>
    </header>
  );
}

function Dialogs() {
  const { dialogs, closeDialog } = useUi();

  return (
    <>
      <SubjectForm
        open={dialogs.subject.open}
        subject={dialogs.subject.value}
        onClose={() => closeDialog('subject')}
      />
      <AssessmentForm
        open={dialogs.assessment.open}
        assessment={dialogs.assessment.value}
        defaultSubjectId={dialogs.assessment.subjectId}
        onClose={() => closeDialog('assessment')}
      />
      <StudyLogForm
        open={dialogs.log.open}
        log={dialogs.log.value}
        defaultSubjectId={dialogs.log.subjectId}
        onClose={() => closeDialog('log')}
      />
      <GoalForm
        open={dialogs.goal.open}
        goal={dialogs.goal.value}
        defaultSubjectId={dialogs.goal.subjectId}
        onClose={() => closeDialog('goal')}
      />
      <ConfirmDialog
        open={dialogs.confirm !== null}
        title={dialogs.confirm?.title ?? ''}
        message={dialogs.confirm?.message ?? ''}
        confirmLabel={dialogs.confirm?.confirmLabel}
        onCancel={() => closeDialog('confirm')}
        onConfirm={() => {
          dialogs.confirm?.onConfirm();
          closeDialog('confirm');
        }}
      />
    </>
  );
}

function Shell() {
  const { data } = useStore();
  useAppliedTheme(data.settings.theme);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <PageOutlet />
      </div>
      <Dialogs />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <UiProvider>
          <Shell />
        </UiProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
