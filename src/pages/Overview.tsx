/** Overall status, what needs attention, today's plan, subjects, exams, insights. */

import React from 'react';
import { useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { AnimatedDuration, AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Meter, PriorityMark, StatusDot, TrendIndicator, scoreTone, toneClass } from '../components/ui/Indicators';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { SubjectTable } from './parts/SubjectTable';
import { TodayPlan } from './parts/TodayPlan';
import { CoachPanel } from './parts/CoachPanel';
import { formatSignedMinutes, pluralize } from '../lib/utils';

export function OverviewPage() {
  const { data } = useStore();
  const derived = useDerived();
  const ui = useUi();
  const { overall, counts, period, ranked, examViews } = derived;

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="book"
            title="No subjects yet"
            text="Add your subjects to start tracking where you stand, what needs attention and what to study next."
            actionLabel="Add subject"
            onAction={() => ui.openSubject()}
          />
        </div>
      </div>
    );
  }

  const attention = ranked.filter((v) => v.priority.level !== 'maintain').slice(0, 3);
  const upcoming = examViews.filter((e) => e.info.daysAway !== null && e.info.daysAway >= 0).slice(0, 3);

  return (
    <div className="page page-transition">
      <div className="stack">
        {/* 1 — Overall status */}
        <section className="panel enter">
          <div className="status">
            <div>
              <p className="eyebrow">Academic status</p>
              <div className="status__score" style={{ marginTop: 8 }}>
                <span className={`status__number ${toneClass(overall.score)}`}>
                  <AnimatedNumber value={overall.score} duration={900} />
                </span>
                <span className="status__denom">/ 100</span>
              </div>
              <div className="status__meta">
                <span className="status__label">{overall.label}</span>
                <TrendIndicator direction={overall.trend} delta={overall.trendDelta} note="No trend yet" />
              </div>
              <button type="button" className="link-btn" style={{ marginTop: 10 }} onClick={ui.openScoreInfo}>
                How is this calculated?
              </button>
            </div>

            <dl className="status__facts">
              <div className="status__fact">
                <dt>Estimated grade</dt>
                <dd>
                  {overall.currentGrade ?? '—'}
                  <small>
                    {overall.currentPercent === null
                      ? 'No assessments yet'
                      : `${overall.currentPercent}% across ${overall.scoredSubjects} ${pluralize(
                          overall.scoredSubjects,
                          'subject',
                        )}`}
                  </small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Target</dt>
                <dd>
                  {overall.targetGrade ?? '—'}
                  <small>
                    {overall.gap === null
                      ? 'Set a target on your subjects'
                      : overall.gap <= 0
                        ? 'At or above target'
                        : `${overall.gap} points to go`}
                  </small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Syllabus</dt>
                <dd>
                  {overall.coverage === null ? '—' : `${overall.coverage}%`}
                  <small>
                    {overall.coverage === null ? 'No topics tracked' : `${counts.topics} topics tracked`}
                  </small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Study this week</dt>
                <dd>
                  <AnimatedDuration minutes={period.thisWeek} />
                  <small>
                    {period.lastWeek || period.thisWeek
                      ? `${formatSignedMinutes(period.change)} vs last week`
                      : 'Nothing logged yet'}
                  </small>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 2 — What needs attention */}
        {attention.length > 0 && (
          <section className="section enter" style={{ ['--i' as string]: 1 }}>
            <div className="section__head">
              <h2>Needs attention</h2>
              <button type="button" className="link-btn" onClick={() => ui.navigate('focus')}>
                Open My Focus
              </button>
            </div>
            <div className="panel">
              {attention.map((view, i) => (
                <button
                  key={view.subject.id}
                  type="button"
                  className="list-row enter--fast"
                  style={{ ['--i' as string]: i }}
                  onClick={() => ui.openSubjectDetail(view.subject.id)}
                >
                  <span className="list-row__main">
                    <span className="cell-name">{view.subject.name}</span>
                    <span className="cell-sub">{view.priority.headline}</span>
                  </span>
                  <span className="list-row__side">
                    <PriorityMark level={view.priority.level} />
                    <Icon name="chevron-right" size={14} className="faint" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3 — Today's plan */}
        <section className="section enter" style={{ ['--i' as string]: 2 }}>
          <TodayPlan compact />
        </section>

        <div className="cols">
          <div className="stack">
            {/* 4 — Subject status */}
            <section className="section enter" style={{ ['--i' as string]: 3 }}>
              <div className="section__head">
                <h2>Subjects</h2>
                <Button size="sm" icon="plus" onClick={() => ui.openSubject()}>
                  Add subject
                </Button>
              </div>
              <div className="panel">
                <SubjectTable views={ranked} />
              </div>
            </section>

            {/* 5 — Progress */}
            <section className="section enter" style={{ ['--i' as string]: 4 }}>
              <div className="section__head">
                <h2>Progress</h2>
                <button type="button" className="link-btn" onClick={() => ui.navigate('study')}>
                  Study analytics
                </button>
              </div>
              <div className="panel panel--pad">
                <div className="stack stack--tight">
                  <ProgressRow
                    label="Assessment performance"
                    value={overall.currentPercent}
                    note={overall.currentPercent === null ? 'Not enough data yet' : undefined}
                  />
                  <ProgressRow
                    label="Topic mastery"
                    value={overall.mastery}
                    note={overall.mastery === null ? 'No topics tracked yet' : undefined}
                  />
                  <ProgressRow
                    label="Syllabus coverage"
                    value={overall.coverage}
                    /* Low coverage early in the year is expected, not a warning. */
                    neutral
                    note={
                      overall.coverage === null
                        ? 'No syllabus loaded yet'
                        : 'How much you have covered so far — not part of your score.'
                    }
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="stack">
            {/* 6 — Upcoming exams */}
            <section className="section enter" style={{ ['--i' as string]: 5 }}>
              <div className="section__head">
                <h2>Upcoming exams</h2>
                <button type="button" className="link-btn" onClick={() => ui.navigate('exams')}>
                  All exams
                </button>
              </div>
              <div className="panel">
                {!upcoming.length ? (
                  <EmptyState
                    icon="calendar"
                    title="No exams scheduled"
                    text="Add an exam and the topics it covers move up your focus list as the date approaches."
                    actionLabel="Add exam"
                    onAction={() => ui.openExam()}
                  />
                ) : (
                  upcoming.map((view, i) => (
                    <button
                      key={view.exam.id}
                      type="button"
                      className="list-row enter--fast"
                      style={{ ['--i' as string]: i }}
                      onClick={() => ui.navigate('exams')}
                    >
                      <span className="list-row__main">
                        <span className="cell-name">{view.exam.name}</span>
                        <span className="cell-sub">
                          {derived.bySubjectId.get(view.exam.subjectId)?.subject.name} ·{' '}
                          {view.info.remaining} {pluralize(view.info.remaining, 'topic')} not yet strong
                        </span>
                      </span>
                      <span className="list-row__side num" style={{ fontWeight: 560 }}>
                        {view.info.label}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* 7 — Coach insights */}
            <section className="section enter" style={{ ['--i' as string]: 6 }}>
              <CoachPanel />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  note,
  neutral = false,
}: {
  label: string;
  value: number | null;
  note?: string;
  neutral?: boolean;
}) {
  return (
    <div>
      <div className="row row--between" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: '0.844rem' }}>{label}</span>
        <span
          className={`num ${neutral ? 'muted' : toneClass(value)}`}
          style={{ fontWeight: 560, fontSize: '0.844rem' }}
        >
          {value === null ? '—' : `${value}%`}
        </span>
      </div>
      <Meter value={value ?? 0} tone={neutral ? 'none' : scoreTone(value)} label={label} />
      {note && (
        <p className="faint" style={{ fontSize: '0.719rem', marginTop: 4 }}>
          {note}
        </p>
      )}
    </div>
  );
}
