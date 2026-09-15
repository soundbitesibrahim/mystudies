/** Logged study time: weekly totals and how it is shared between subjects. */

import React, { useMemo, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { AnimatedDuration } from '../components/ui/AnimatedNumber';
import { Meter } from '../components/ui/Indicators';
import { Segmented } from '../components/ui/Segmented';
import { minutesBySubject, sortLogsByDateDesc } from '../lib/studyTime';
import { formatDate, formatMinutes, formatSignedMinutes } from '../lib/utils';

type Window = 'week' | '30';

export function StudyTimePage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const { openLog, openSubject, askConfirm } = useUi();
  const [window, setWindow] = useState<Window>('week');
  const [filter, setFilter] = useState('all');

  const distribution = useMemo(() => {
    if (window === 'week') return derived.weekDistribution;
    return minutesBySubject(data.studyLogs, data.subjects, 30);
  }, [window, derived.weekDistribution, data.studyLogs, data.subjects]);

  const logs = useMemo(() => {
    const scoped = filter === 'all' ? data.studyLogs : data.studyLogs.filter((l) => l.subjectId === filter);
    return sortLogsByDateDesc(scoped).slice(0, 60);
  }, [data.studyLogs, filter]);

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="clock"
            title="Add a subject first"
            text="Study time is always logged against a subject, so start there."
            actionLabel="Add subject"
            onAction={() => openSubject()}
          />
        </div>
      </div>
    );
  }

  const { week } = derived;
  const changeTone = week.change > 0 ? 'tone-good' : week.change < 0 ? 'tone-bad' : 'muted';

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="grid grid--3">
          <div className="metric enter" style={{ ['--i' as string]: 0 }}>
            <span className="metric__label">This week</span>
            <span className="metric__value">
              <AnimatedDuration minutes={week.thisWeek} />
            </span>
            <span className="metric__foot">From {formatDate(week.thisWeekStart)}</span>
          </div>
          <div className="metric enter" style={{ ['--i' as string]: 1 }}>
            <span className="metric__label">Last week</span>
            <span className="metric__value">
              <AnimatedDuration minutes={week.lastWeek} />
            </span>
            <span className="metric__foot">From {formatDate(week.lastWeekStart)}</span>
          </div>
          <div className="metric enter" style={{ ['--i' as string]: 2 }}>
            <span className="metric__label">Change</span>
            <span className={`metric__value ${changeTone}`}>
              <span aria-hidden="true">{week.change > 0 ? '↑ ' : week.change < 0 ? '↓ ' : ''}</span>
              {formatSignedMinutes(week.change)}
            </span>
            <span className="metric__foot">
              {week.change === 0 ? 'Level with last week' : 'Compared with last week'}
            </span>
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 3 }}>
          <div className="section__head">
            <div>
              <h2>Where your time goes</h2>
              <p className="section__hint">
                Distribution across subjects — uneven time is one of the priority signals.
              </p>
            </div>
            <Segmented
              ariaLabel="Time window"
              value={window}
              onChange={setWindow}
              options={[
                { value: 'week', label: 'This week' },
                { value: '30', label: 'Last 30 days' },
              ]}
            />
          </div>

          <div className="panel panel--pad">
            {distribution.total === 0 ? (
              <EmptyState
                icon="clock"
                title="Nothing logged in this period"
                text="Log a session and your weekly totals and distribution will update straight away."
                actionLabel="Log study time"
                onAction={() => openLog()}
              />
            ) : (
              <div>
                {distribution.rows.map((row, i) => {
                  const subject = derived.bySubjectId.get(row.subjectId)?.subject;
                  if (!subject) return null;
                  return (
                    <div key={row.subjectId} className="bar-row enter--fast" style={{ ['--i' as string]: i }}>
                      <span className="bar-row__name">{subject.name}</span>
                      <Meter
                        value={row.minutes}
                        max={Math.max(1, distribution.rows[0].minutes)}
                        label={`${subject.name}: ${formatMinutes(row.minutes)}`}
                      />
                      <span className="bar-row__value num">
                        {formatMinutes(row.minutes)}
                        <span className="faint"> · {Math.round(row.share * 100)}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 4 }}>
          <div className="section__head">
            <div>
              <h2>Logged sessions</h2>
              <p className="section__hint">Most recent first.</p>
            </div>
            <div className="row">
              <label className="sr-only" htmlFor="log-filter">
                Filter by subject
              </label>
              <select
                id="log-filter"
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
              <Button variant="primary" size="sm" icon="plus" onClick={() => openLog()}>
                Log study time
              </Button>
            </div>
          </div>

          <div className="panel">
            {!logs.length ? (
              <EmptyState
                icon="clock"
                title="No study time logged"
                text="Record how long you studied and this page will track your weekly totals."
                actionLabel="Log study time"
                onAction={() => openLog()}
              />
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <caption className="sr-only">Study sessions you have logged</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Note</th>
                      <th scope="col" className="td-right">
                        Duration
                      </th>
                      <th scope="col" className="td-actions">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const subject = derived.bySubjectId.get(log.subjectId)?.subject;
                      return (
                        <tr key={log.id} className="enter--fast" style={{ ['--i' as string]: i }}>
                          <td className="num">{formatDate(log.date)}</td>
                          <td className="cell-name">{subject?.name ?? '—'}</td>
                          <td className="muted">{log.note || <span className="faint">—</span>}</td>
                          <td className="td-right num" style={{ fontWeight: 600 }}>
                            {formatMinutes(log.minutes)}
                          </td>
                          <td className="td-actions">
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                              <IconButton icon="edit" label="Edit session" onClick={() => openLog(log)} />
                              <IconButton
                                icon="trash"
                                label="Delete session"
                                onClick={() =>
                                  askConfirm({
                                    title: 'Delete this session?',
                                    message: `${formatMinutes(log.minutes)} on ${formatDate(log.date)} will be removed from your totals.`,
                                    onConfirm: () => actions.deleteLog(log.id),
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
