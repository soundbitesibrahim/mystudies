/** Add or change a task on the daily plan. The plan is always the user's. */

import React, { useEffect, useMemo, useState } from 'react';
import type { PlanTask } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { parseNumberOrNull, todayISO } from '../../lib/utils';

interface Props {
  open: boolean;
  task: PlanTask | null;
  onClose: () => void;
}

export function TaskForm({ open, task, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [at, setAt] = useState('');
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (task) {
      setSubjectId(task.subjectId);
      setTopicId(task.topicId ?? '');
      setMinutes(String(task.minutes));
      setAt(task.at);
      setDate(task.date);
    } else {
      setSubjectId(data.subjects[0]?.id || '');
      setTopicId('');
      setMinutes(String(data.settings.defaultSessionMinutes));
      setAt('');
      setDate(todayISO());
    }
  }, [open, task, data.subjects, data.settings.defaultSessionMinutes]);

  const topics = useMemo(
    () => data.topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.order - b.order),
    [data.topics, subjectId],
  );

  const submit = () => {
    const next: Record<string, string> = {};
    if (!subjectId) next.subjectId = 'Choose a subject';
    const mins = parseNumberOrNull(minutes);
    if (mins === null || mins < 5) next.minutes = 'At least 5 minutes';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      date: date || todayISO(),
      subjectId,
      topicId: topicId || null,
      minutes: Math.round(mins as number),
      at,
      status: task?.status ?? ('planned' as const),
      fromEngine: task?.fromEngine ?? false,
      reasons: task?.reasons ?? [],
    };

    if (task) {
      actions.updateTask(task.id, payload);
      toast.success('Task updated');
    } else {
      actions.addTask(payload);
      toast.success('Added to your plan');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={task ? 'Edit task' : 'Add to plan'}
      subtitle="Your plan, your call — change anything the engine proposed."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!data.subjects.length}>
            {task ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      {!data.subjects.length ? (
        <p className="muted">Add a subject first.</p>
      ) : (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <SelectField
            label="Subject"
            value={subjectId}
            error={errors.subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId('');
            }}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Topic" hint="optional" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">No specific topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} ` : ''}
                {t.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Duration"
            hint="minutes"
            type="number"
            min={5}
            max={600}
            value={minutes}
            error={errors.minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />

          <TextField label="Time" hint="optional" type="time" value={at} onChange={(e) => setAt(e.target.value)} />

          <TextField
            className="span-2"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>
      )}
    </Modal>
  );
}
