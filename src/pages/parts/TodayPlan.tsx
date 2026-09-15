/** Today's plan. The engine proposes; every row stays editable. */

import React from 'react';
import { useActions, useDerived, useStore } from '../../state/store';
import { useUi } from '../../state/ui';
import { Button, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { AnimatedDuration } from '../../components/ui/AnimatedNumber';
import { formatMinutes, todayISO } from '../../lib/utils';

export function TodayPlan({ compact = false }: { compact?: boolean }) {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const { todayTasks, planSummary, recommendations } = derived;

  const fillFromEngine = () => {
    const existing = new Set(todayTasks.map((t) => `${t.subjectId}:${t.topicId ?? ''}`));
    let added = 0;
    for (const rec of recommendations) {
      if (added >= 3) break;
      const key = `${rec.subjectId}:${rec.topicId}`;
      if (existing.has(key)) continue;
      actions.addTask({
        date: todayISO(),
        subjectId: rec.subjectId,
        topicId: rec.topicId,
        minutes: rec.minutes,
        at: '',
        status: 'planned',
        fromEngine: true,
        reasons: rec.reasons.slice(0, 3).map((r) => r.text),
      });
      existing.add(key);
      added += 1;
    }
  };

  return (
    <>
      <div className="section__head">
        <div>
          <h2>Today</h2>
          <p className="section__hint">
            {planSummary.tasks
              ? `${formatMinutes(planSummary.planned)} planned · ${formatMinutes(
                  planSummary.completed,
                )} done · ${formatMinutes(planSummary.remaining)} remaining`
              : 'Nothing planned yet.'}
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {recommendations.length > 0 && (
            <Button size="sm" icon="spark" onClick={fillFromEngine}>
              Suggest tasks
            </Button>
          )}
          <Button size="sm" icon="plus" onClick={() => ui.openTask()} disabled={!data.subjects.length}>
            Add task
          </Button>
        </div>
      </div>

      <div className="panel">
        {!todayTasks.length ? (
          <EmptyState
            icon="clock"
            title="No plan for today"
            text={
              recommendations.length
                ? 'Let the focus engine suggest what to work on, or add your own tasks. Either way the plan is yours to change.'
                : 'Add a task, or record some topic mastery so the focus engine has something to work with.'
            }
            actionLabel={recommendations.length ? undefined : 'Add task'}
            onAction={recommendations.length ? undefined : () => ui.openTask()}
          />
        ) : (
          todayTasks.map((task, i) => {
            const subject = derived.bySubjectId.get(task.subjectId)?.subject;
            const topic = task.topicId ? derived.topicById.get(task.topicId) : null;
            const done = task.status === 'done';
            const skipped = task.status === 'skipped';
            return (
              <div
                key={task.id}
                className="list-row enter--fast"
                style={{ ['--i' as string]: i, opacity: done || skipped ? 0.55 : 1 }}
              >
                <span className="list-row__main">
                  <span className="row" style={{ gap: 8 }}>
                    {task.at && <span className="mono faint">{task.at}</span>}
                    <span
                      className="cell-name"
                      style={{ textDecoration: done || skipped ? 'line-through' : 'none' }}
                    >
                      {topic ? topic.topic.name : (subject?.name ?? 'Task')}
                    </span>
                  </span>
                  <span className="cell-sub">
                    {topic ? `${subject?.name} · ` : ''}
                    {formatMinutes(task.minutes)}
                    {task.fromEngine && task.reasons.length > 0 && !compact && ` · ${task.reasons[0]}`}
                    {skipped && ' · skipped'}
                    {task.status === 'snoozed' && ' · snoozed to tomorrow'}
                  </span>
                </span>
                <span className="list-row__side">
                  {!done && !skipped && (
                    <Button size="sm" icon="play" onClick={() => ui.openRunner(task)}>
                      <span className="btn-label">Start</span>
                    </Button>
                  )}
                  {!done && (
                    <IconButton
                      icon="check"
                      label={`Mark ${topic?.topic.name ?? subject?.name ?? 'task'} done`}
                      onClick={() => actions.updateTask(task.id, { status: 'done' })}
                    />
                  )}
                  {!compact && (
                    <>
                      <IconButton
                        icon="arrow-up"
                        label="Move task up"
                        onClick={() => actions.moveTask(task.id, -1)}
                      />
                      <IconButton
                        icon="arrow-down"
                        label="Move task down"
                        onClick={() => actions.moveTask(task.id, 1)}
                      />
                      <IconButton icon="edit" label="Edit task" onClick={() => ui.openTask(task)} />
                      <IconButton
                        icon="skip"
                        label="Skip task"
                        onClick={() => actions.updateTask(task.id, { status: 'skipped' })}
                      />
                    </>
                  )}
                  <IconButton
                    icon="trash"
                    label="Remove task"
                    onClick={() => actions.deleteTask(task.id)}
                  />
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
