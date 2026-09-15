/** Exams with countdowns and how ready you are for each. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { Meter, scoreTone, toneClass } from '../components/ui/Indicators';
import { formatDate, pluralize } from '../lib/utils';

export function ExamsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();

  const upcoming = derived.examViews.filter((e) => !e.info.past);
  const past = derived.examViews.filter((e) => e.info.past);

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="calendar"
            title="Add a subject first"
            text="Exams always belong to a subject."
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
              <h2>Upcoming</h2>
              <p className="section__hint">
                Topics covered by a close exam move up your focus list automatically — within{' '}
                {data.settings.examHorizonDays} days, set in Settings.
              </p>
            </div>
            <Button variant="primary" size="sm" icon="plus" onClick={() => ui.openExam()}>
              Add exam
            </Button>
          </div>

          <div className="panel">
            {!upcoming.length ? (
              <EmptyState
                icon="calendar"
                title="No exams scheduled"
                text="Add an exam with the topics it covers and the countdown starts feeding your priorities."
                actionLabel="Add exam"
                onAction={() => ui.openExam()}
              />
            ) : (
              upcoming.map((view, i) => {
                const subject = derived.bySubjectId.get(view.exam.subjectId)?.subject;
                const soon = view.info.daysAway !== null && view.info.daysAway <= 14;
                return (
                  <div
                    key={view.exam.id}
                    className="enter--fast"
                    style={{ ['--i' as string]: i, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="row row--between row--wrap" style={{ gap: 10, marginBottom: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-name">{view.exam.name}</div>
                        <div className="cell-sub">
                          {subject?.name} · {formatDate(view.exam.date)}
                          {view.exam.targetGrade && ` · target ${view.exam.targetGrade}`}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span className={`badge${soon ? ' badge--attention' : ''} num`}>{view.info.label}</span>
                        <IconButton icon="edit" label={`Edit ${view.exam.name}`} onClick={() => ui.openExam(view.exam)} />
                        <IconButton
                          icon="trash"
                          label={`Delete ${view.exam.name}`}
                          onClick={() =>
                            ui.askConfirm({
                              title: `Delete "${view.exam.name}"?`,
                              message: 'The countdown and its effect on your priorities will be removed.',
                              onConfirm: () => actions.deleteExam(view.exam.id),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="row" style={{ gap: 12 }}>
                      <span className="muted num" style={{ fontSize: '0.813rem', minWidth: 150 }}>
                        {view.info.readiness === null ? (
                          <span className="faint">No topics tracked</span>
                        ) : (
                          <>
                            <span className={toneClass(view.info.readiness)} style={{ fontWeight: 560 }}>
                              {view.info.readiness}% ready
                            </span>
                            <span className="faint">
                              {' '}
                              · {view.info.remaining} {pluralize(view.info.remaining, 'topic')} left
                            </span>
                          </>
                        )}
                      </span>
                      <span style={{ flex: 1 }}>
                        <Meter
                          value={view.info.readiness ?? 0}
                          tone={scoreTone(view.info.readiness)}
                          label={`${view.exam.name} readiness`}
                        />
                      </span>
                    </div>

                    <p className="faint" style={{ fontSize: '0.719rem', marginTop: 6 }}>
                      {view.exam.topicIds.length
                        ? `${view.exam.topicIds.length} ${pluralize(view.exam.topicIds.length, 'topic')} linked`
                        : 'Covers the whole subject'}
                      {view.exam.note && ` · ${view.exam.note}`}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {past.length > 0 && (
          <section className="section enter" style={{ ['--i' as string]: 1 }}>
            <div className="section__head">
              <h2>Past</h2>
            </div>
            <div className="panel">
              {past.map((view, i) => (
                <div key={view.exam.id} className="list-row enter--fast" style={{ ['--i' as string]: i }}>
                  <span className="list-row__main">
                    <span className="cell-name">{view.exam.name}</span>
                    <span className="cell-sub">
                      {derived.bySubjectId.get(view.exam.subjectId)?.subject.name} · {formatDate(view.exam.date)}
                    </span>
                  </span>
                  <span className="list-row__side">
                    <span className="faint num">{view.info.label}</span>
                    <IconButton icon="edit" label={`Edit ${view.exam.name}`} onClick={() => ui.openExam(view.exam)} />
                    <IconButton
                      icon="trash"
                      label={`Delete ${view.exam.name}`}
                      onClick={() =>
                        ui.askConfirm({
                          title: `Delete "${view.exam.name}"?`,
                          message: 'This exam will be removed.',
                          onConfirm: () => actions.deleteExam(view.exam.id),
                        })
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
