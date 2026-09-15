/** Subject list, and the per-subject dashboard. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Meter, TrendIndicator, scoreTone, toneClass } from '../components/ui/Indicators';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Icon } from '../components/ui/Icon';
import { SubjectTable } from './parts/SubjectTable';
import { ASSESSMENT_TYPE_LABEL } from '../components/forms/AssessmentForm';
import { assessmentPercent } from '../lib/performance';
import { concernReasons, positiveReasons } from '../lib/priority';
import { formatDate, formatMinutes, pluralize, relativeDays, round } from '../lib/utils';
import { seedForCode, seedForName } from '../data/syllabus';

export function SubjectsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const ui = useUi();

  if (ui.subjectId) return <SubjectDetail subjectId={ui.subjectId} />;

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="book"
            title="No subjects yet"
            text="Add your subjects to begin. If the name or code matches a syllabus we know, the chapter outline can be loaded for you."
            actionLabel="Add subject"
            onAction={() => ui.openSubject()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section">
          <div className="section__head">
            <div>
              <h2>Subjects</h2>
              <p className="section__hint">Select a subject for its full dashboard.</p>
            </div>
            <Button variant="primary" size="sm" icon="plus" onClick={() => ui.openSubject()}>
              Add subject
            </Button>
          </div>
          <div className="panel">
            <SubjectTable views={derived.ranked} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SubjectDetail({ subjectId }: { subjectId: string }) {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const view = derived.bySubjectId.get(subjectId);

  if (!view) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState icon="book" title="Subject not found" text="It may have been deleted." />
        </div>
      </div>
    );
  }

  const { subject, performance, trend, priority } = view;
  const seed = seedForCode(subject.code) ?? seedForName(subject.name);
  const recentAssessments = [...view.assessments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="page page-transition">
      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="chevron-left" onClick={ui.closeSubjectDetail}>
            All subjects
          </Button>
          <span className="spacer" />
          <Button size="sm" icon="clipboard" onClick={() => ui.openAssessment(null, subject.id)}>
            Add assessment
          </Button>
          <Button size="sm" icon="clock" onClick={() => ui.openSession(null, subject.id)}>
            Log study
          </Button>
          <Button size="sm" icon="edit" onClick={() => ui.openSubject(subject)}>
            Edit
          </Button>
        </div>

        <section className="panel enter">
          <div className="status">
            <div>
              <p className="eyebrow">
                {subject.name}
                {subject.code && <span className="mono"> · {subject.code}</span>}
              </p>
              <div className="status__score" style={{ marginTop: 8 }}>
                <span className={`status__number ${toneClass(view.currentPercent)}`}>
                  {view.currentGrade ?? '—'}
                </span>
                <span className="status__denom">
                  {view.currentPercent === null ? 'not enough data' : `${view.currentPercent}%`}
                </span>
              </div>
              <div className="status__meta">
                <TrendIndicator direction={trend.direction} delta={trend.delta} note={trend.note} />
                {priority.overridden && <span className="badge">Manual priority</span>}
              </div>
              {performance.note && (
                <p className="faint" style={{ fontSize: '0.75rem', marginTop: 8 }}>
                  {performance.note}
                </p>
              )}
            </div>

            <dl className="status__facts">
              <div className="status__fact">
                <dt>Target</dt>
                <dd>
                  {view.targetGrade ?? (view.targetPercent === null ? '—' : `${view.targetPercent}%`)}
                  <small>
                    {view.gap === null
                      ? 'Set a target to track the gap'
                      : view.gap <= 0
                        ? 'At or above target'
                        : `${view.gap} points to go`}
                  </small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Mastery</dt>
                <dd>
                  {view.mastery === null ? '—' : `${view.mastery}%`}
                  <small>{view.topics.length} {pluralize(view.topics.length, 'topic')} tracked</small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Syllabus</dt>
                <dd>
                  {view.coverage === null ? '—' : `${Math.round(view.coverage * 100)}%`}
                  <small>{view.chapters.length} {pluralize(view.chapters.length, 'chapter')}</small>
                </dd>
              </div>
              <div className="status__fact">
                <dt>Study time</dt>
                <dd>
                  {formatMinutes(view.weekMinutes)}
                  <small>this week · {formatMinutes(view.totalMinutes)} total</small>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Recommended next action */}
        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <h2>Recommended next action</h2>
          </div>
          <div className="panel panel--pad">
            {!view.nextAction ? (
              <p className="muted" style={{ fontSize: '0.844rem' }}>
                No recommendation yet — add syllabus topics and set their mastery so the engine has
                something to rank.
              </p>
            ) : (
              (() => {
                const rec = view.nextAction;
                const topic = derived.topicById.get(rec.topicId);
                if (!topic) return null;
                return (
                  <div className="stack stack--tight">
                    <div className="row row--wrap" style={{ gap: 10 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600 }}>{topic.topic.name}</span>
                      <span className="badge">{formatMinutes(rec.minutes)}</span>
                      <span className={`badge badge--${scoreTone(topic.mastery.value)}`}>
                        {topic.mastery.value}% mastery
                      </span>
                    </div>
                    <ul className="reasons">
                      {rec.reasons.slice(0, 3).map((reason, i) => (
                        <li key={i} className="reason">
                          <span className="reason__mark" aria-hidden="true" />
                          <span>{reason.text}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="row" style={{ gap: 6 }}>
                      <Button
                        size="sm"
                        variant="primary"
                        icon="play"
                        onClick={() => ui.openRunner(null, subject.id, rec.topicId)}
                      >
                        Start
                      </Button>
                      <Button size="sm" icon="edit" onClick={() => ui.openTopic(rec.topicId)}>
                        Edit topic
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </section>

        <div className="cols">
          <div className="stack">
            {/* Weaknesses and strengths */}
            <section className="section enter" style={{ ['--i' as string]: 2 }}>
              <div className="section__head">
                <h2>Biggest weaknesses</h2>
              </div>
              <div className="panel">
                {!view.weakTopics.length ? (
                  <p className="muted" style={{ padding: '16px 20px', fontSize: '0.844rem' }}>
                    {view.topics.length
                      ? 'No weak topics flagged. Set mastery states or record a topic breakdown on an assessment.'
                      : 'No syllabus topics yet.'}
                  </p>
                ) : (
                  view.weakTopics.slice(0, 5).map((topic, i) => (
                    <button
                      key={topic.topic.id}
                      type="button"
                      className="list-row enter--fast"
                      style={{ ['--i' as string]: i }}
                      onClick={() => ui.openTopic(topic.topic.id)}
                    >
                      <span className="list-row__main">
                        <span className="cell-name">
                          {i + 1}. {topic.topic.name}
                        </span>
                        <span className="cell-sub">
                          {topic.chapterName} · {topic.revision.label}
                        </span>
                      </span>
                      <span className="list-row__side">
                        <span className={`num ${toneClass(topic.mastery.value)}`} style={{ fontWeight: 560 }}>
                          {topic.mastery.value}%
                        </span>
                        <Icon name="chevron-right" size={14} className="faint" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="section enter" style={{ ['--i' as string]: 3 }}>
              <div className="section__head">
                <h2>Strongest areas</h2>
              </div>
              <div className="panel">
                {!view.strongTopics.length ? (
                  <p className="muted" style={{ padding: '16px 20px', fontSize: '0.844rem' }}>
                    Nothing at 75% mastery yet.
                  </p>
                ) : (
                  view.strongTopics.slice(0, 5).map((topic, i) => (
                    <button
                      key={topic.topic.id}
                      type="button"
                      className="list-row enter--fast"
                      style={{ ['--i' as string]: i }}
                      onClick={() => ui.openTopic(topic.topic.id)}
                    >
                      <span className="list-row__main">
                        <span className="cell-name">
                          {i + 1}. {topic.topic.name}
                        </span>
                        <span className="cell-sub">{topic.chapterName}</span>
                      </span>
                      <span className="list-row__side">
                        <span className="num tone-good" style={{ fontWeight: 560 }}>
                          {topic.mastery.value}%
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Syllabus */}
            <section className="section enter" style={{ ['--i' as string]: 4 }}>
              <div className="section__head">
                <h2>Syllabus</h2>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    ui.setSyllabusFilter({ subjectId: subject.id, view: 'all' });
                    ui.navigate('syllabus');
                  }}
                >
                  Open syllabus
                </button>
              </div>
              <div className="panel">
                {!view.chapters.length ? (
                  <div style={{ padding: '18px 20px' }}>
                    <p className="muted" style={{ fontSize: '0.844rem', marginBottom: 10 }}>
                      No syllabus loaded for this subject.
                    </p>
                    {seed && (
                      <Button
                        size="sm"
                        icon="layers"
                        onClick={() => {
                          actions.applySeed(subject.id, seed);
                        }}
                      >
                        Load the {seed.name} ({seed.code}) outline
                      </Button>
                    )}
                  </div>
                ) : (
                  view.chapters.map((chapter, i) => (
                    <div key={chapter.chapter.id} className="list-row enter--fast" style={{ ['--i' as string]: i }}>
                      <span className="list-row__main">
                        <span className="cell-name">
                          {chapter.chapter.code && <span className="mono faint">{chapter.chapter.code}. </span>}
                          {chapter.chapter.name}
                        </span>
                        <span className="cell-sub">
                          {chapter.topics.length} {pluralize(chapter.topics.length, 'topic')}
                        </span>
                      </span>
                      <span className="list-row__side">
                        <span style={{ width: 90 }}>
                          <Meter value={chapter.completion} label={`${chapter.chapter.name} progress`} />
                        </span>
                        <span className="num faint" style={{ minWidth: 34, textAlign: 'right' }}>
                          {chapter.completion}%
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="stack">
            {/* Why this priority */}
            <section className="section enter" style={{ ['--i' as string]: 5 }}>
              <div className="section__head">
                <h2>Why this priority</h2>
              </div>
              <div className="panel panel--pad">
                <ul className="reasons">
                  {concernReasons(priority).map((reason, i) => (
                    <li key={i} className="reason">
                      <span className="reason__mark" aria-hidden="true" />
                      <span>{reason.text}</span>
                    </li>
                  ))}
                  {positiveReasons(priority).map((reason, i) => (
                    <li key={`p-${i}`} className="reason">
                      <span className="reason__mark" style={{ background: 'var(--good)' }} aria-hidden="true" />
                      <span>{reason.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Recent assessments */}
            <section className="section enter" style={{ ['--i' as string]: 6 }}>
              <div className="section__head">
                <h2>Recent assessments</h2>
              </div>
              <div className="panel">
                {!recentAssessments.length ? (
                  <EmptyState
                    icon="clipboard"
                    title="No assessments yet"
                    text="Add your first result to start measuring performance in this subject."
                    actionLabel="Add assessment"
                    onAction={() => ui.openAssessment(null, subject.id)}
                  />
                ) : (
                  recentAssessments.map((assessment, i) => {
                    const pct = round(assessmentPercent(assessment), 0);
                    return (
                      <button
                        key={assessment.id}
                        type="button"
                        className="list-row enter--fast"
                        style={{ ['--i' as string]: i }}
                        onClick={() => ui.openAssessment(assessment)}
                      >
                        <span className="list-row__main">
                          <span className="cell-name">{assessment.name}</span>
                          <span className="cell-sub">
                            {ASSESSMENT_TYPE_LABEL[assessment.type]} · {formatDate(assessment.date)}
                          </span>
                        </span>
                        <span className="list-row__side">
                          <span className={`num ${toneClass(pct)}`} style={{ fontWeight: 560 }}>
                            {pct}%
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Study time */}
            <section className="section enter" style={{ ['--i' as string]: 7 }}>
              <div className="section__head">
                <h2>Study time</h2>
              </div>
              <div className="panel panel--pad">
                <div className="kv">
                  <span className="kv__key">This week</span>
                  <span className="kv__value">{formatMinutes(view.weekMinutes)}</span>
                </div>
                <div className="kv">
                  <span className="kv__key">Last 14 days</span>
                  <span className="kv__value">{formatMinutes(view.recentMinutes)}</span>
                </div>
                <div className="kv">
                  <span className="kv__key">All time</span>
                  <span className="kv__value">{formatMinutes(view.totalMinutes)}</span>
                </div>
                <div className="kv">
                  <span className="kv__key">Overdue reviews</span>
                  <span className="kv__value">{view.overdueRevisions}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="section enter" style={{ ['--i' as string]: 8 }}>
          <div className="panel panel--pad">
            <div className="row row--between row--wrap" style={{ gap: 12 }}>
              <div>
                <p style={{ fontWeight: 560, fontSize: '0.875rem' }}>Delete this subject</p>
                <p className="faint" style={{ fontSize: '0.781rem' }}>
                  Removes its syllabus, assessments, study sessions, goals and exams.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon="trash"
                onClick={() =>
                  ui.askConfirm({
                    title: `Delete ${subject.name}?`,
                    message:
                      'This also removes its syllabus, assessments, study sessions, goals and exams. This cannot be undone.',
                    confirmLabel: 'Delete subject',
                    onConfirm: () => {
                      actions.deleteSubject(subject.id);
                      ui.closeSubjectDetail();
                    },
                  })
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
