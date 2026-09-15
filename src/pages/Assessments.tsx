/** Assessment history. Simple by design: name, subject, date, score. */

import React, { useMemo, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { toneClass } from '../components/ui/Indicators';
import { assessmentPercent, sortAssessments } from '../lib/scoring';
import { gradeFromPercent } from '../lib/grades';
import { formatDate, mean, pluralize, round } from '../lib/utils';

export function AssessmentsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const { openAssessment, openSubject, askConfirm } = useUi();
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const scoped =
      filter === 'all' ? data.assessments : data.assessments.filter((a) => a.subjectId === filter);
    return sortAssessments(scoped).reverse();
  }, [data.assessments, filter]);

  const average = useMemo(() => {
    const values = rows.map(assessmentPercent);
    const avg = mean(values);
    return avg === null ? null : round(avg, 1);
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
            onAction={() => openSubject()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="grid grid--3">
          <Metric
            index={0}
            label="Recorded"
            value={<AnimatedNumber value={rows.length} duration={600} />}
            foot={`${pluralize(rows.length, 'result')} in view`}
          />
          <Metric
            index={1}
            label="Average"
            value={
              <span className={toneClass(average)}>
                <AnimatedNumber value={average} duration={800} decimals={1} format={(n) => `${n}%`} />
              </span>
            }
            foot={average === null ? 'Nothing recorded yet' : `Grade ${gradeFromPercent(average)}`}
          />
          <Metric
            index={2}
            label="Latest"
            value={
              rows.length ? (
                <AnimatedNumber
                  value={round(assessmentPercent(rows[0]), 1)}
                  duration={800}
                  decimals={1}
                  format={(n) => `${n}%`}
                />
              ) : (
                <span className="faint">—</span>
              )
            }
            foot={rows.length ? `${rows[0].name} · ${formatDate(rows[0].date)}` : 'No results yet'}
          />
        </section>

        <section className="section">
          <div className="section__head">
            <div>
              <h2>Assessment history</h2>
              <p className="section__hint">Percentages are calculated for you and feed your status.</p>
            </div>
            <div className="row">
              <label className="sr-only" htmlFor="assessment-filter">
                Filter by subject
              </label>
              <select
                id="assessment-filter"
                className="select"
                style={{ width: 'auto', minWidth: 160 }}
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
              <Button variant="primary" size="sm" icon="plus" onClick={() => openAssessment()}>
                Add assessment
              </Button>
            </div>
          </div>

          <div className="panel">
            {!rows.length ? (
              <EmptyState
                icon="clipboard"
                title="No assessments recorded"
                text="Add a test or exam score and your standing, trend and priorities will update automatically."
                actionLabel="Add assessment"
                onAction={() => openAssessment()}
              />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Every assessment you have recorded</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Assessment</th>
                      <th scope="col">Subject</th>
                      <th scope="col" className="td-right">
                        Score
                      </th>
                      <th scope="col" className="td-right">
                        Percentage
                      </th>
                      <th scope="col" className="td-actions">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a, i) => {
                      const pct = round(assessmentPercent(a), 1);
                      const subject = derived.bySubjectId.get(a.subjectId)?.subject;
                      return (
                        <tr key={a.id} className="enter--fast" style={{ ['--i' as string]: i }}>
                          <td className="num">{formatDate(a.date)}</td>
                          <td>
                            <div className="cell-name">{a.name}</div>
                            {a.note && <div className="cell-sub">{a.note}</div>}
                          </td>
                          <td>{subject?.name ?? '—'}</td>
                          <td className="td-right num">
                            {a.score} / {a.maxScore}
                          </td>
                          <td className="td-right num">
                            <span className={toneClass(pct)} style={{ fontWeight: 600 }}>
                              {pct}%
                            </span>{' '}
                            <span className="faint">· {gradeFromPercent(pct)}</span>
                          </td>
                          <td className="td-actions">
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                              <IconButton
                                icon="edit"
                                label={`Edit ${a.name}`}
                                onClick={() => openAssessment(a)}
                              />
                              <IconButton
                                icon="trash"
                                label={`Delete ${a.name}`}
                                onClick={() =>
                                  askConfirm({
                                    title: `Delete "${a.name}"?`,
                                    message: 'This result will no longer count towards your status.',
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

function Metric({
  label,
  value,
  foot,
  index,
}: {
  label: string;
  value: React.ReactNode;
  foot: string;
  index: number;
}) {
  return (
    <div className="metric enter" style={{ ['--i' as string]: index }}>
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      <span className="metric__foot">{foot}</span>
    </div>
  );
}
