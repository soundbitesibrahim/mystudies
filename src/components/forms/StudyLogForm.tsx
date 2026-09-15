/** Log study time. Totals only — this is deliberately not a timetable. */

import React, { useEffect, useState } from 'react';
import type { StudyLog } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { formatMinutes, parseNumberOrNull, todayISO } from '../../lib/utils';

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

interface StudyLogFormProps {
  open: boolean;
  log: StudyLog | null;
  defaultSubjectId?: string;
  onClose: () => void;
}

export function StudyLogForm({ open, log, defaultSubjectId, onClose }: StudyLogFormProps) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (log) {
      setSubjectId(log.subjectId);
      setDate(log.date);
      setMinutes(String(log.minutes));
      setNote(log.note);
    } else {
      setSubjectId(defaultSubjectId || data.subjects[0]?.id || '');
      setDate(todayISO());
      setMinutes('');
      setNote('');
    }
  }, [open, log, defaultSubjectId, data.subjects]);

  const submit = () => {
    const next: Record<string, string> = {};
    if (!subjectId) next.subjectId = 'Choose a subject';
    const mins = parseNumberOrNull(minutes);
    if (mins === null || mins <= 0) next.minutes = 'Enter how long you studied';
    else if (mins > 1440) next.minutes = 'That is more than a day';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      subjectId,
      date: date || todayISO(),
      minutes: Math.round(mins as number),
      note: note.trim(),
    };

    if (log) {
      actions.updateLog(log.id, payload);
      toast.success('Study time updated');
    } else {
      actions.addLog(payload);
      const name = data.subjects.find((s) => s.id === subjectId)?.name ?? 'Session';
      toast.success(`${name} — ${formatMinutes(payload.minutes)} logged`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={log ? 'Edit study time' : 'Log study time'}
      subtitle="Just the subject, the day and how long."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!data.subjects.length}>
            {log ? 'Save changes' : 'Log time'}
          </Button>
        </>
      }
    >
      {!data.subjects.length ? (
        <p className="muted">Add a subject first — study time is always logged against a subject.</p>
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
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <TextField
            className="span-2"
            label="Duration"
            hint="in minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            placeholder="45"
            value={minutes}
            error={errors.minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />

          <div className="span-2 chip-row">
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={`badge ${minutes === String(m) ? 'badge--accent' : 'badge--neutral'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setMinutes(String(m))}
              >
                {formatMinutes(m)}
              </button>
            ))}
          </div>

          <TextAreaField
            className="span-2"
            label="Note"
            hint="optional"
            placeholder="What you worked on"
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
          />

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>
      )}
    </Modal>
  );
}
