/** Dashboard 1 — "How am I doing?" */

import React from 'react';
import { useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { AnimatedDuration, AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Meter, PriorityBadge, TrendIndicator, toneClass } from '../components/ui/Indicators';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { describePerformance } from '../lib/grades';
import { formatSignedMinutes, pluralize } from '../lib/utils';
import { concernReasons } from '../lib/priority';

export function OverviewPage() {
  const { data } = useStore();
  const derived = useDerived();
  const { navigate, openSubject } = useUi();
  const { overall, counts, week, ranked, subjectViews } = derived;

  if (!subjectViews.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="book"
            title="No subjects yet"
            text="Add your subjects to begin tracking your academic status, priorities and progress."
            actionLabel="Add subject"
            onAction={() => openSubject()}
          />
        </div>
      </div>
    );
  }

  const attention = ranked.filter((v) => v.priority.level !== 'maintain').slice(0, 3);
  const goalsOnTrack = counts.goalsAchieved;

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="panel enter" style={{ ['--i' as string]: 0 }}>
          <div className="hero">
            <div>
              <p className="eyebrow">My academic status</p>
              <div className="hero__score" style={{ marginTop: 10 }}>
                <span className={`hero__number ${toneClass(overall.score)}`}>
                  <AnimatedNumber value={overall.score} duration={1100} />
                </span>
                <span className="hero__denom">/ 100</span>
              </div>
              <div className="hero__meta">
                <span className="hero__label">{overall.label}</span>
                <TrendIndicator direction={overall.trend} delta={overall.trendDelta} note="No trend yet" />
              </div>
              <p className="section__hint" style={{ marginTop: 10 }}>
                Based on {overall.scored} of {overall.total} {pluralize(overall.total, 'subject')} with
                information recorded.
              </p>
            </div>

            <div className="hero__breakdown">
              <PriorityBar
                label="Maintain"
                count={counts.maintain}
                total={counts.subjects}
                tone="good"
              />
              <PriorityBar label="Medium" count={counts.medium} total={counts.subjects} tone="warn" />
              <PriorityBar label="High priority" count={counts.high} total={counts.subjects} tone="bad" />
            </div>
          </div>
        </section>

        <section className="grid grid--4">
          <Metric
            index={1}
            label="Subjects"
            value={<AnimatedNumber value={counts.subjects} duration={700} />}
            foot={`${counts.maintain} holding steady`}
          />
          <Metric
            index={2}
            label="Needs attention"
            value={
              <span className={counts.high ? 'tone-bad' : 'tone-good'}>
                <AnimatedNumber value={counts.high + counts.medium} duration={700} />
              </span>
            }
            foot={counts.high ? `${counts.high} high priority` : 'Nothing urgent'}
          />
          <Metric
            index={3}
            label="Study this week"
            value={<AnimatedDuration minutes={week.thisWeek} />}
            foot={
              week.lastWeek || week.thisWeek
                ? `${formatSignedMinutes(week.change)} vs last week`
                : 'Nothing logged yet'
            }
          />
          <Metric
            index={4}
            label="Goals achieved"
            value={
              <>
                <AnimatedNumber value={goalsOnTrack} duration={700} />
                <span className="faint" style={{ fontSize: '1rem' }}>
                  {' '}
                  / {counts.goals}
                </span>
              </>
            }
            foot={counts.goals ? 'Targets you have reached' : 'No goals set'}
          />
        </section>

        {attention.length > 0 && (
          <section className="section enter" style={{ ['--i' as string]: 5 }}>
            <div className="section__head">
              <h2>
                Needs you most
                <span className="badge badge--neutral">{attention.length}</span>
              </h2>
              <button type="button" className="link-btn" onClick={() => navigate('focus')}>
                Open My Focus →
              </button>
            </div>
            <div className="panel">
              {attention.map((view, i) => {
                const reason = concernReasons(view.priority)[0];
                return (
                  <button
                    key={view.subject.id}
                    type="button"
                    className="list-row enter--fast"
                    style={{ ['--i' as string]: i }}
                    onClick={() => navigate('focus')}
                  >
                    <span className="list-row__main">
                      <span className="cell-name">{view.subject.name}</span>
                      <span className="cell-sub">{reason ? reason.text : 'Needs a closer look'}</span>
                    </span>
                    <span className="list-row__side">
                      <PriorityBadge level={view.priority.level} compact />
                      <Icon name="chevron-right" size={15} className="list-row__chevron" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="section enter" style={{ ['--i' as string]: 6 }}>
          <div className="section__head">
            <h2>Subject status</h2>
            <Button size="sm" icon="plus" onClick={() => openSubject()}>
              Add subject
            </Button>
          </div>
          <div className="panel">
            <div className="table-wrap">
              <table className="data">
                <caption className="sr-only">Status of every subject you track</caption>
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    <th scope="col" className="td-right">
                      Rating
                    </th>
                    <th scope="col" className="td-right">
                      Performance
                    </th>
                    <th scope="col">Trend</th>
                    <th scope="col">Priority</th>
                    <th scope="col" className="td-right">
                      Standing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((view, i) => (
                    <tr
                      key={view.subject.id}
                      className="enter--fast"
                      style={{ ['--i' as string]: i }}
                    >
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          style={{ color: 'inherit', fontWeight: 600 }}
                          onClick={() => openSubject(view.subject)}
                        >
                          {view.subject.name}
                        </button>
                        {view.subject.weakness && (
                          <div className="cell-sub" title={view.subject.weakness}>
                            {view.subject.weakness.length > 54
                              ? `${view.subject.weakness.slice(0, 54)}…`
                              : view.subject.weakness}
                          </div>
                        )}
                      </td>
                      <td className="td-right num">
                        {view.subject.rating === null ? (
                          <span className="faint">—</span>
                        ) : (
                          view.subject.rating
                        )}
                      </td>
                      <td className="td-right num">
                        {describePerformance(
                          view.health.performancePercent,
                          view.subject.currentGrade,
                        )}
                      </td>
                      <td>
                        <TrendIndicator
                          direction={view.trend.direction}
                          delta={view.trend.delta}
                          note={view.trend.note}
                          showLabel={false}
                        />
                      </td>
                      <td>
                        <PriorityBadge level={view.priority.level} compact />
                      </td>
                      <td className="td-right">
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
                          <span className={`num ${toneClass(view.health.score)}`} style={{ fontWeight: 600 }}>
                            {view.health.score ?? '—'}
                          </span>
                          <span style={{ width: 54 }}>
                            <Meter
                              value={view.health.score ?? 0}
                              tone={
                                view.health.score === null
                                  ? undefined
                                  : view.health.score >= 75
                                    ? 'good'
                                    : view.health.score >= 55
                                      ? 'warn'
                                      : 'bad'
                              }
                              label={`${view.subject.name} standing`}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

function PriorityBar({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: 'good' | 'warn' | 'bad';
}) {
  return (
    <div className="bar-row" style={{ gridTemplateColumns: 'minmax(96px,120px) minmax(0,1fr) auto' }}>
      <span className="bar-row__name">{label}</span>
      <Meter value={count} max={Math.max(1, total)} tone={tone} label={`${label}: ${count}`} />
      <span className="bar-row__value num">{count}</span>
    </div>
  );
}
