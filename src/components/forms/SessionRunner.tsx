/**
 * Runs a study session: start, pause, finish, then the two questions whose
 * answers shape future recommendations.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { PlanTask, Understanding } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextAreaField } from '../ui/Field';
import { useActions, useDerived, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { todayISO } from '../../lib/utils';

interface Props {
  open: boolean;
  task: PlanTask | null;
  subjectId?: string;
  topicId?: string | null;
  onClose: () => void;
}

type Phase = 'running' | 'review';

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function SessionRunner({ open, task, subjectId, topicId, onClose }: Props) {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const toast = useToast();

  const resolvedSubjectId = task?.subjectId ?? subjectId ?? '';
  const resolvedTopicId = task?.topicId ?? topicId ?? null;
  const planned = task?.minutes ?? data.settings.defaultSessionMinutes;

  const [phase, setPhase] = useState<Phase>('running');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [understanding, setUnderstanding] = useState<Understanding | null>(null);
  const tickRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    setPhase('running');
    setElapsed(0);
    setRunning(true);
    setNote('');
    setConfidence(null);
    setUnderstanding(null);
  }, [open]);

  useEffect(() => {
    if (!open || !running || phase !== 'running') return;
    tickRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(tickRef.current);
  }, [open, running, phase]);

  const subject = data.subjects.find((s) => s.id === resolvedSubjectId);
  const topicView = resolvedTopicId ? derived.topicById.get(resolvedTopicId) : null;

  const minutesDone = Math.max(1, Math.round(elapsed / 60));

  const finish = () => {
    setRunning(false);
    setPhase('review');
  };

  const save = () => {
    if (!resolvedSubjectId) {
      onClose();
      return;
    }
    actions.addSession({
      subjectId: resolvedSubjectId,
      topicId: resolvedTopicId,
      date: todayISO(),
      minutes: minutesDone,
      note: note.trim(),
      confidence,
      understanding,
    });
    if (task) actions.updateTask(task.id, { status: 'done' });
    toast.success(
      topicView
        ? `${minutesDone} min logged — ${topicView.topic.name} review rescheduled`
        : `${minutesDone} min logged`,
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title={phase === 'running' ? 'Study session' : 'How did it go?'}
      subtitle={
        subject
          ? `${subject.name}${topicView ? ` · ${topicView.topic.name}` : ''} · ${planned} min planned`
          : undefined
      }
      onClose={onClose}
      footer={
        phase === 'running' ? (
          <>
            <Button icon={running ? 'pause' : 'play'} onClick={() => setRunning((r) => !r)}>
              {running ? 'Pause' : 'Resume'}
            </Button>
            <span className="spacer" />
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={finish}>
              Finish
            </Button>
          </>
        ) : (
          <>
            <span className="muted" style={{ fontSize: '0.813rem' }}>
              Logging {minutesDone} min
            </span>
            <span className="spacer" />
            <Button onClick={onClose}>Discard</Button>
            <Button variant="primary" onClick={save}>
              Save session
            </Button>
          </>
        )
      }
    >
      {phase === 'running' ? (
        <div>
          <div className="timer">
            <span className="timer__value num">{formatClock(elapsed)}</span>
            <span className="timer__label">
              {running ? 'Running' : 'Paused'} · target {planned} min
            </span>
          </div>
          {topicView?.topic.weakness && (
            <div className="quote" style={{ marginTop: 12 }}>
              <span className="quote__label">Your note on this topic</span>
              {topicView.topic.weakness}
            </div>
          )}
          <p className="faint" style={{ fontSize: '0.781rem', marginTop: 14 }}>
            The timer is a convenience — you can finish early or late and the logged time follows the clock.
          </p>
        </div>
      ) : (
        <div className="stack stack--tight">
          <div className="field">
            <span className="field__label">How confident are you now?</span>
            <div className="chip-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={confidence === n}
                  onClick={() => setConfidence(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Did you understand it?</span>
            <div className="chip-row">
              {(['yes', 'partly', 'no'] as Understanding[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={understanding === value}
                  onClick={() => setUnderstanding(value)}
                >
                  {value === 'yes' ? 'Yes' : value === 'partly' ? 'Partly' : 'No'}
                </button>
              ))}
            </div>
          </div>

          <TextAreaField
            label="Note"
            hint="optional"
            placeholder="What you covered, what to come back to"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />

          <p className="faint" style={{ fontSize: '0.75rem' }}>
            {topicView
              ? 'These answers set when this topic comes back for revision and how strongly it is recommended.'
              : 'Both answers are optional.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
