/** App shell: navigation, animated page transitions and the global dialogs. */

import React, { useEffect, useRef, useState } from 'react';
import { StoreProvider, useStore } from './state/store';
import { UiProvider, useUi, type PageId } from './state/ui';
import { useAppliedTheme } from './state/theme';
import { ToastProvider } from './components/ui/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { Button, IconButton } from './components/ui/Button';
import { SubjectForm } from './components/forms/SubjectForm';
import { AssessmentForm } from './components/forms/AssessmentForm';
import { SessionForm } from './components/forms/SessionForm';
import { GoalForm } from './components/forms/GoalForm';
import { ExamForm } from './components/forms/ExamForm';
import { TopicDialog } from './components/forms/TopicDialog';
import { TaskForm } from './components/forms/TaskForm';
import { SessionRunner } from './components/forms/SessionRunner';
import { ScoreInfoDialog } from './components/ui/ScoreInfoDialog';
import { SearchDialog } from './components/ui/SearchDialog';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OverviewPage } from './pages/Overview';
import { FocusPage } from './pages/Focus';
import { SubjectsPage } from './pages/Subjects';
import { SyllabusPage } from './pages/Syllabus';
import { AssessmentsPage } from './pages/Assessments';
import { StudyPage } from './pages/Study';
import { RevisionPage } from './pages/Revision';
import { GoalsPage } from './pages/Goals';
import { ExamsPage } from './pages/Exams';
import { SettingsPage } from './pages/Settings';

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  overview: { title: 'Overview', subtitle: 'Where you stand and what to do next' },
  focus: { title: 'My Focus', subtitle: 'What needs you most, and why' },
  subjects: { title: 'Subjects', subtitle: 'Performance, targets and mastery' },
  syllabus: { title: 'Syllabus', subtitle: 'Chapters, topics and what you actually know' },
  assessments: { title: 'Assessments', subtitle: 'Results and topic breakdowns' },
  study: { title: 'Study', subtitle: 'Totals, distribution and balance' },
  revision: { title: 'Revision', subtitle: 'What is due for review' },
  goals: { title: 'Goals', subtitle: 'Targets and the gap to them' },
  exams: { title: 'Exams', subtitle: 'Countdowns and readiness' },
  settings: { title: 'Settings', subtitle: 'Grading, recommendations and your data' },
};

const PAGES: Record<PageId, React.ComponentType> = {
  overview: OverviewPage,
  focus: FocusPage,
  subjects: SubjectsPage,
  syllabus: SyllabusPage,
  assessments: AssessmentsPage,
  study: StudyPage,
  revision: RevisionPage,
  goals: GoalsPage,
  exams: ExamsPage,
  settings: SettingsPage,
};

const EXIT_MS = 110;

/** Holds the outgoing page briefly so it can animate out before the new one enters. */
function PageOutlet() {
  const { page, subjectId } = useUi();
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
    <div className={leaving ? 'page-transition--leaving' : undefined} key={`${rendered}:${subjectId ?? ''}`}>
      <Component />
    </div>
  );
}

function Topbar() {
  const ui = useUi();
  const { data } = useStore();
  const meta = PAGE_META[ui.page];
  const hasSubjects = data.subjects.length > 0;

  return (
    <header className="topbar">
      <IconButton icon="menu" label="Open navigation" className="menu-btn" onClick={() => ui.setMenuOpen(true)} />
      <div className="topbar__title" key={ui.page}>
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </div>
      <div className="topbar__actions">
        <Button size="sm" icon="search" onClick={ui.openSearch}>
          <span className="btn-label">Search</span>
        </Button>
        <Button size="sm" icon="clipboard" disabled={!hasSubjects} onClick={() => ui.openAssessment()}>
          <span className="btn-label">Assessment</span>
        </Button>
        <Button size="sm" icon="clock" disabled={!hasSubjects} onClick={() => ui.openSession()}>
          <span className="btn-label">Study</span>
        </Button>
        <Button size="sm" variant="primary" icon="plus" onClick={() => ui.openSubject()}>
          <span className="btn-label">Subject</span>
        </Button>
      </div>
    </header>
  );
}

function Dialogs() {
  const ui = useUi();
  const { dialogs, closeDialog } = ui;

  return (
    <>
      <SubjectForm open={dialogs.subject.open} subject={dialogs.subject.value} onClose={() => closeDialog('subject')} />
      <AssessmentForm
        open={dialogs.assessment.open}
        assessment={dialogs.assessment.value}
        defaultSubjectId={dialogs.assessment.subjectId}
        onClose={() => closeDialog('assessment')}
      />
      <SessionForm
        open={dialogs.session.open}
        session={dialogs.session.value}
        defaultSubjectId={dialogs.session.subjectId}
        defaultTopicId={dialogs.session.topicId}
        onClose={() => closeDialog('session')}
      />
      <GoalForm
        open={dialogs.goal.open}
        goal={dialogs.goal.value}
        defaultSubjectId={dialogs.goal.subjectId}
        onClose={() => closeDialog('goal')}
      />
      <ExamForm
        open={dialogs.exam.open}
        exam={dialogs.exam.value}
        defaultSubjectId={dialogs.exam.subjectId}
        onClose={() => closeDialog('exam')}
      />
      <TopicDialog open={dialogs.topic.open} topicId={dialogs.topic.topicId} onClose={() => closeDialog('topic')} />
      <TaskForm open={dialogs.task.open} task={dialogs.task.value} onClose={() => closeDialog('task')} />
      <SessionRunner
        open={dialogs.runner.open}
        task={dialogs.runner.task}
        subjectId={dialogs.runner.subjectId}
        topicId={dialogs.runner.topicId}
        onClose={() => closeDialog('runner')}
      />
      <ScoreInfoDialog open={dialogs.scoreInfo.open} onClose={() => closeDialog('scoreInfo')} />
      <SearchDialog open={dialogs.search.open} onClose={() => closeDialog('search')} />
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
  const ui = useUi();
  useAppliedTheme(data.settings.theme);

  // Cmd/Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ui]);

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
