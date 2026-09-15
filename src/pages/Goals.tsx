/** Goals: target, current, gap, deadline and progress. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { Meter } from '../components/ui/Indicators';
import { goalKindLabel, goalTargetLabel } from '../lib/goals';
import { formatDate, pluralize } from '../lib/utils';

const STATUS_BADGE: Record<string, string> = {
  achieved: 'badge--good',
  close: 'badge--attention',
  behind: 'badge--risk',
  'no-data': '',
};

export function GoalsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section">
          <div className="section__head">
            <div>
              <h2>Goals</h2>
              <p className="section__hint">
                {data.goals.length
                  ? `${derived.counts.goalsAchieved} of ${data.goals.length} ${pluralize(
                      data.goals.length,
                      'target',
                    )} reached.`
                  : 'Set a target and the gap to it is tracked for you.'}
              </p>
            </div>
            <Button variant="primary" size="sm" icon="plus" onClick={() => ui.openGoal()}>
              Add goal
            </Button>
          </div>

          <div className="panel">
            {!data.goals.length ? (
              <EmptyState
                icon="flag"
                title="No goals set"
                text="Add a target — a grade, a percentage, syllabus coverage, weekly study time or an exam result — and the gap to it is tracked here."
                actionLabel="Add goal"
                onAction={() => ui.openGoal()}
              />
            ) : (
              data.goals.map((goal, i) => {
                const progress = derived.goalProgress.get(goal.id);
                const subjectName =
                  goal.scope === 'overall'
                    ? 'Overall'
                    : (derived.bySubjectId.get(goal.subjectId ?? '')?.subject.name ?? 'Subject');
                const status = progress?.status ?? 'no-data';
                return (
                  <div
                    key={goal.id}
                    className="enter--fast"
                    style={{ ['--i' as string]: i, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="row row--between row--wrap" style={{ gap: 10, marginBottom: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-name">
                          {subjectName} → {goalTargetLabel(goal, data.settings.gradeThresholds)}
                        </div>
                        <div className="cell-sub">
                          {goalKindLabel(goal.kind)}
                          {goal.deadline && ` · ${formatDate(goal.deadline)}`}
                          {progress?.daysLeft !== null && progress?.daysLeft !== undefined && goal.deadline && (
                            <>
                              {' · '}
                              {progress.daysLeft >= 0
                                ? `${progress.daysLeft} ${pluralize(progress.daysLeft, 'day')} left`
                                : `${Math.abs(progress.daysLeft)} ${pluralize(Math.abs(progress.daysLeft), 'day')} ago`}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <span className={`badge ${STATUS_BADGE[status]}`}>
                          {progress?.statusLabel ?? 'Not enough data'}
                        </span>
                        <IconButton icon="edit" label={`Edit goal: ${subjectName}`} onClick={() => ui.openGoal(goal)} />
                        <IconButton
                          icon="trash"
                          label={`Delete goal: ${subjectName}`}
                          onClick={() =>
                            ui.askConfirm({
                              title: 'Delete this goal?',
                              message: `${subjectName} → ${goalTargetLabel(goal, data.settings.gradeThresholds)} will be removed.`,
                              onConfirm: () => actions.deleteGoal(goal.id),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="row" style={{ gap: 12 }}>
                      <span className="num muted" style={{ fontSize: '0.813rem', minWidth: 120 }}>
                        {progress?.currentLabel ?? '—'}
                        <span className="faint"> of {progress?.targetLabel ?? '—'}</span>
                      </span>
                      <span style={{ flex: 1 }}>
                        <Meter
                          value={(progress?.progress ?? 0) * 100}
                          tone={
                            status === 'achieved'
                              ? 'good'
                              : status === 'close'
                                ? 'attention'
                                : status === 'behind'
                                  ? 'risk'
                                  : 'none'
                          }
                          label={`Progress towards ${goalTargetLabel(goal, data.settings.gradeThresholds)}`}
                        />
                      </span>
                    </div>

                    {goal.note && (
                      <p className="muted" style={{ fontSize: '0.813rem', marginTop: 8 }}>
                        {goal.note}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
