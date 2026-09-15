/** Study analytics: totals across periods, distribution, and whether it is balanced. */

import React, { useMemo, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { AnimatedDuration } from '../components/ui/AnimatedNumber';
import { Meter, Sparkline, StatusDot } from '../components/ui/Indicators';
import { Segmented } from '../components/ui/Segmented';
import { dailyMinutes, minutesBySubject, sortSessionsByDateDesc } from '../lib/studyTime';
import { formatDate, formatMinutes, formatSignedMinutes, pluralize } from '../lib/utils';

type Window = 'week' | '30';

export function StudyPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const [window, setWindow] = useState<Window>('week');
  const [filter, setFilter] = useState('all');

  const distribution = useMemo(
    () => (window === 'week' ? derived.weekDistribution : minutesBySubject(data.studySessions, data.subjects, 30)),
    [window, derived.weekDistribution, data.studySessions, data.subjects],
  );

  const sessions = useMemo(() => {
    const scoped =
      filter === 'all' ? data.studySessions : data.studySessions.filter((s) => s.subjectId === filter);
    return sortSessionsByDateDesc(scoped).slice(0, 60);
  }, [data.studySessions, filter]);

  const daily = useMemo(() => dailyMinutes(data.studySessions, 28), [data.studySessions]);

  /** Time spent on subjects that are already fine, while high-priority ones wait. */
  const balance = useMemo(() => {
    if (!distribution.total) return null;
    const rows = distribution.rows.map((row) => {
      const view = derived.bySubjectId.get(row.subjectId);
      return { row, view };
    });
    const overStudied = rows.find(
      ({ row, view }) => view?.priority.level === 'maintain' && row.share >= 0.35,
    );
    const neglected = rows.find(
      ({ row, view }) => view?.priority.level === 'high' && row.share < 0.12,
    );
    if (!overStudied && !neglected) return null;
    return { overStudied, neglected };
  }, [distribution, derived.bySubjectId]);

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="clock"
            title="Add a subject first"
            text="Study time is always logged against a subject, so start there."
            actionLabel="Add subject"
            onAction={() => ui.openSubject()}
          />
        </div>
      </div>
    );
  }

  const { period } = derived;
  const changeTone = period.change > 0 ? 'tone-good' : period.change < 0 ? 'tone-risk' : 'muted';
  const monthChange = period.last30 - period.previous30;

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="grid grid--4 enter">
          <div className="metric">
            <span className="metric__label">This week</span>
            <span className="metric__value">
              <AnimatedDuration minutes={period.thisWeek} />
            </span>
            <span className="metric__foot">From {formatDate(period.thisWeekStart)}</span>
          </div>
          <div className="metric">
            <span className="metric__label">Last week</span>
            <span className="metric__value">
              <AnimatedDuration minutes={period.lastWeek} />
            </span>
            <span className={`metric__foot ${changeTone}`}>
              {formatSignedMinutes(period.change)} change
            </span>
          </div>
          <div className="metric">
            <span className="metric__label">This month</span>
            <span className="metric__value">
              <AnimatedDuration minutes={period.thisMonth} />
            </span>
            <span className="metric__foot">Calendar month to date</span>
          </div>
          <div className="metric">
            <span className="metric__label">Last 30 days</span>
            <span className="metric__value">
              <AnimatedDuration minutes={period.last30} />
            </span>
            <span className="metric__foot">
              {formatSignedMinutes(monthChange)} vs previous 30
            </span>
          </div>
        </section>

        {daily.some((d) => d.minutes > 0) && (
          <section className="section enter" style={{ ['--i' as string]: 1 }}>
            <div className="section__head">
              <div>
                <h2>Last 28 days</h2>
                <p className="section__hint">Minutes logged per day.</p>
              </div>
            </div>
            <div className="panel panel--pad">
              <Sparkline values={daily.map((d) => d.minutes)} label="Study minutes per day over the last 28 days" height={48} />
              <div className="row row--between faint" style={{ fontSize: '0.719rem', marginTop: 6 }}>
                <span>{formatDate(daily[0].date)}</span>
                <span>{formatDate(daily[daily.length - 1].date)}</span>
              </div>
            </div>
          </section>
        )}

        <section className="section enter" style={{ ['--i' as string]: 2 }}>
          <div className="section__head">
            <div>
              <h2>Where your time goes</h2>
              <p className="section__hint">Distribution across subjects — imbalance is a priority signal.</p>
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
                text="Log a session and your totals and distribution update straight away."
                actionLabel="Log study time"
                onAction={() => ui.openSession()}
              />
            ) : (
              <>
                {distribution.rows.map((row, i) => {
                  const view = derived.bySubjectId.get(row.subjectId);
                  if (!view) return null;
                  return (
                    <div key={row.subjectId} className="bar-row enter--fast" style={{ ['--i' as string]: i }}>
                      <span className="bar-row__name row" style={{ gap: 8 }}>
                        <StatusDot
                          tone={
                            view.priority.level === 'high'
                              ? 'risk'
                              : view.priority.level === 'medium'
                                ? 'attention'
                                : 'good'
                          }
                        />
                        {view.subject.name}
                      </span>
                      <Meter
                        value={row.minutes}
                        max={Math.max(1, distribution.rows[0].minutes)}
                        label={`${view.subject.name}: ${formatMinutes(row.minutes)}`}
                      />
                      <span className="bar-row__value num">
                        {formatMinutes(row.minutes)}
                        <span className="faint"> · {Math.round(row.share * 100)}%</span>
                      </span>
                    </div>
                  );
                })}

                {balance && (
                  <div className="notice" style={{ marginTop: 14 }}>
                    <div className="notice__body">
                      {balance.overStudied && (
                        <p>
                          {Math.round(balance.overStudied.row.share * 100)}% of this period went to{' '}
                          <strong>{balance.overStudied.view?.subject.name}</strong>, which is already at
                          or above target.
                        </p>
                      )}
                      {balance.neglected && (
                        <p>
                          <strong>{balance.neglected.view?.subject.name}</strong> is high priority but
                          received only {Math.round(balance.neglected.row.share * 100)}% of your time.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 3 }}>
          <div className="section__head">
            <div>
              <h2>Logged sessions</h2>
              <p className="section__hint">Most recent first.</p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="sr-only" htmlFor="session-filter">
                Filter by subject
              </label>
              <select
                id="session-filter"
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
              <Button variant="primary" size="sm" icon="plus" onClick={() => ui.openSession()}>
                Log study time
              </Button>
            </div>
          </div>

          <div className="panel">
            {!sessions.length ? (
              <EmptyState
                icon="clock"
                title="No study time logged"
                text="Record how long you studied and this page tracks your weekly totals and balance."
                actionLabel="Log study time"
                onAction={() => ui.openSession()}
              />
            ) : (
              <div className="table-wrap">
                <table className="data stackable">
                  <caption className="sr-only">Study sessions you have logged</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Topic</th>
                      <th scope="col">After</th>
                      <th scope="col" className="td-right">
                        Duration
                      </th>
                      <th scope="col" className="td-actions">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, i) => {
                      const subject = derived.bySubjectId.get(session.subjectId)?.subject;
                      const topic = session.topicId ? derived.topicById.get(session.topicId) : null;
                      return (
                        <tr key={session.id} className="enter--fast" style={{ ['--i' as string]: i }}>
                          <td data-label="Date" className="num">
                            {formatDate(session.date)}
                          </td>
                          <td data-label="Subject" className="cell-name">
                            {subject?.name ?? '—'}
                          </td>
                          <td data-label="Topic" className="muted">
                            {topic?.topic.name ?? <span className="faint">—</span>}
                          </td>
                          <td data-label="After" className="muted">
                            {session.confidence !== null || session.understanding ? (
                              <>
                                {session.confidence !== null && `${session.confidence}/5`}
                                {session.confidence !== null && session.understanding && ' · '}
                                {session.understanding === 'yes'
                                  ? 'Understood'
                                  : session.understanding === 'partly'
                                    ? 'Partly'
                                    : session.understanding === 'no'
                                      ? 'Not yet'
                                      : ''}
                              </>
                            ) : (
                              <span className="faint">—</span>
                            )}
                          </td>
                          <td data-label="Duration" className="td-right num" style={{ fontWeight: 560 }}>
                            {formatMinutes(session.minutes)}
                          </td>
                          <td data-label="" className="td-actions">
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                              <IconButton icon="edit" label="Edit session" onClick={() => ui.openSession(session)} />
                              <IconButton
                                icon="trash"
                                label="Delete session"
                                onClick={() =>
                                  ui.askConfirm({
                                    title: 'Delete this session?',
                                    message: `${formatMinutes(session.minutes)} on ${formatDate(session.date)} will be removed from your totals.`,
                                    onConfirm: () => actions.deleteSession(session.id),
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
