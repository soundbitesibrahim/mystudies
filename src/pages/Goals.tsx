/** Academic goals and the gap between current and target. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { Meter } from '../components/ui/Indicators';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { goalTargetLabel } from '../lib/goals';
import type { GoalProgress } from '../lib/goals';
import type { Goal } from '../lib/types';
import { formatDate, pluralize } from '../lib/utils';

export function GoalsPage() {
  const { data } = useStore();
  const derived = useDerived();
  const { openGoal } = useUi();

  const goals = data.goals;

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section">
          <div className="section__head">
            <div>
              <h2>
                Goals
                {goals.length > 0 && <span className="badge badge--neutral">{goals.length}</span>}
              </h2>
              <p className="section__hint">
                {goals.length
                  ? `${derived.counts.goalsAchieved} of ${goals.length} ${pluralize(goals.length, 'target')} reached.`
                  : 'Set a target and the gap is tracked for you.'}
              </p>
            </div>
            <Button variant="primary" size="sm" icon="plus" onClick={() => openGoal()}>
              Add goal
            </Button>
          </div>

          {!goals.length ? (
            <div className="panel">
              <EmptyState
                icon="flag"
                title="No goals set"
                text="Add a target — an overall grade, or a percentage for one subject — and the gap to it will be tracked here."
                actionLabel="Add goal"
                onAction={() => openGoal()}
              />
            </div>
          ) : (
            <div className="grid grid--2">
              {goals.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={derived.goalProgress.get(goal.id)}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  achieved: 'badge--maintain',
  close: 'badge--medium',
  behind: 'badge--high',
  'no-data': 'badge--neutral',
};

function GoalCard({
  goal,
  progress,
  index,
}: {
  goal: Goal;
  progress?: GoalProgress;
  index: number;
}) {
  const derived = useDerived();
  const actions = useActions();
  const { openGoal, askConfirm } = useUi();

  const subjectName =
    goal.scope === 'overall'
      ? 'Overall'
      : (derived.bySubjectId.get(goal.subjectId ?? '')?.subject.name ?? 'Subject');

  const status = progress?.status ?? 'no-data';

  return (
    <article className="card card--interactive enter" style={{ ['--i' as string]: index }}>
      <div className="card__head">
        <div style={{ minWidth: 0 }}>
          <h3 className="card__title">
            {subjectName} → {goalTargetLabel(goal)}
          </h3>
          <p className="cell-sub">
            {goal.deadline ? (
              <>
                {formatDate(goal.deadline)}
                {progress?.daysLeft !== null && progress?.daysLeft !== undefined && (
                  <>
                    {' · '}
                    {progress.daysLeft >= 0
                      ? `${progress.daysLeft} ${pluralize(progress.daysLeft, 'day')} left`
                      : `${Math.abs(progress.daysLeft)} ${pluralize(Math.abs(progress.daysLeft), 'day')} ago`}
                  </>
                )}
              </>
            ) : (
              'No deadline'
            )}
          </p>
        </div>
        <div className="card__actions">
          <IconButton icon="edit" label={`Edit goal: ${subjectName}`} onClick={() => openGoal(goal)} />
          <IconButton
            icon="trash"
            label={`Delete goal: ${subjectName}`}
            onClick={() =>
              askConfirm({
                title: 'Delete this goal?',
                message: `${subjectName} → ${goalTargetLabel(goal)} will be removed.`,
                onConfirm: () => actions.deleteGoal(goal.id),
              })
            }
          />
        </div>
      </div>

      <div className="row row--between">
        <span className={`badge ${STATUS_BADGE[status]}`}>{progress?.statusLabel ?? 'Not enough data'}</span>
        <span className="num muted" style={{ fontSize: '0.875rem' }}>
          <AnimatedNumber value={progress?.currentPercent ?? null} duration={700} format={(n) => `${n}%`} />
          <span className="faint"> of {progress?.targetPercent ?? '—'}%</span>
        </span>
      </div>

      <Meter
        value={(progress?.progress ?? 0) * 100}
        tone={status === 'achieved' ? 'good' : status === 'close' ? 'warn' : status === 'behind' ? 'bad' : undefined}
        label={`Progress towards ${goalTargetLabel(goal)}`}
      />

      {goal.note && <p className="muted" style={{ fontSize: '0.85rem' }}>{goal.note}</p>}
    </article>
  );
}
