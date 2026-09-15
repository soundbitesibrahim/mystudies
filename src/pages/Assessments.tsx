/** Assessment history, with the topic breakdown that feeds topic mastery. */

import React, { useMemo, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { toneClass } from '../components/ui/Indicators';
import { ASSESSMENT_TYPE_LABEL } from '../components/forms/AssessmentForm';
import { assessmentPercent, sortByDate } from '../lib/performance';
import { gradeFromPercent } from '../lib/grades';
import { formatDate, mean, pluralize, round } from '../lib/utils';

export function AssessmentsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const scoped =
      filter === 'all' ? data.assessments : data.assessments.filter((a) => a.subjectId === filter);
    return sortByDate(scoped).reverse();
  }, [data.assessments, filter]);

  const average = useMemo(() => {
    const avg = mean(rows.map(assessmentPercent));
    return avg === null ? null : round(avg, 0);
  }, [rows]);

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="clipboard"
            title="Add a subject first"
            text="Assessments always belong to a subject, so start by adding the subjects you study."
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
        <section className="grid grid--3 enter">
          <Metric label="Recorded" value={<AnimatedNumber value={rows.length} duration={500} />} foot={`${pluralize(rows.length, 'result')} in view`} />
          <Metric
            label="Average"
            value={
              <span className={toneClass(average)}>
                {average === null ? '—' : <AnimatedNumber value={average} duration={700} format={(n) => `${n}%`} />}
              </span>
            }
            foot={average === null ? 'Nothing recorded yet' : `Grade ${gradeFromPercent(average, data.settings.gradeThresholds)}`}
          />
          <Metric
            label="Latest"
            value={
              rows.length ? (
                <span className={toneClass(round(assessmentPercent(rows[0]), 0))}>
                  {round(assessmentPercent(rows[0]), 0)}%
                </span>
              ) : (
                <span className="faint">—</span>
              )
            }
            foot={rows.length ? `${rows[0].name} · ${formatDate(rows[0].date)}` : 'No results yet'}
          />
        </section>

        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <div>
              <h2>Assessment history</h2>
              <p className="section__hint">
                Percentages are calculated for you. A topic breakdown feeds topic mastery and the
                focus engine.
              </p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="sr-only" htmlFor="assessment-filter">
                Filter by subject
              </label>
              <select
                id="assessment-filter"
                className="select"
                style={{ width: 'auto', minWidth: 150 }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All subjects</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button variant="primary" size="sm" icon="plus" onClick={() => ui.openAssessment()}>
                Add assessment
              </Button>
            </div>
          </div>

          <div className="panel">
            {!rows.length ? (
              <EmptyState
                icon="clipboard"
                title="No assessments yet"
                text="Add your first assessment to start measuring performance. Break it down by topic and your syllabus mastery updates too."
                actionLabel="Add assessment"
                onAction={() => ui.openAssessment()}
              />
            ) : (
              <div className="table-wrap">
                <table className="data stackable">
                  <caption className="sr-only">Every assessment you have recorded</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Assessment</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Type</th>
                      <th scope="col" className="td-right">
                        Score
                      </th>
                      <th scope="col" className="td-right">
                        Result
                      </th>
                      <th scope="col" className="td-actions">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a, i) => {
                      const pct = round(assessmentPercent(a), 0);
                      const subject = derived.bySubjectId.get(a.subjectId)?.subject;
                      return (
                        <tr key={a.id} className="enter--fast" style={{ ['--i' as string]: i }}>
                          <td data-label="Date" className="num">
                            {formatDate(a.date)}
                          </td>
                          <td data-label="Assessment">
                            <div className="cell-name">{a.name}</div>
                            {a.topicResults.length > 0 && (
                              <div className="cell-sub">
                                {a.topicResults.length} {pluralize(a.topicResults.length, 'topic')} broken down
                              </div>
                            )}
                            {a.note && <div className="cell-sub">{a.note}</div>}
                          </td>
                          <td data-label="Subject">{subject?.name ?? '—'}</td>
                          <td data-label="Type" className="muted">
                            {ASSESSMENT_TYPE_LABEL[a.type]}
                          </td>
                          <td data-label="Score" className="td-right num">
                            {a.score} / {a.maxScore}
                          </td>
                          <td data-label="Result" className="td-right num">
                            <span className={toneClass(pct)} style={{ fontWeight: 560 }}>
                              {pct}%
                            </span>{' '}
                            <span className="faint">
                              {gradeFromPercent(pct, data.settings.gradeThresholds)}
                            </span>
                          </td>
                          <td data-label="" className="td-actions">
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                              <IconButton icon="edit" label={`Edit ${a.name}`} onClick={() => ui.openAssessment(a)} />
                              <IconButton
                                icon="trash"
                                label={`Delete ${a.name}`}
                                onClick={() =>
                                  ui.askConfirm({
                                    title: `Delete "${a.name}"?`,
                                    message: 'This result will no longer count towards your performance or topic mastery.',
                                    onConfirm: () => actions.deleteAssessment(a.id),
                                  })
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, foot }: { label: string; value: React.ReactNode; foot: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      <span className="metric__foot">{foot}</span>
    </div>
  );
}
