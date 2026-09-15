/** Log study time against a subject and, optionally, a topic. */

import React, { useEffect, useMemo, useState } from 'react';
import type { StudySession, Understanding } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { formatMinutes, parseNumberOrNull, todayISO } from '../../lib/utils';

const QUICK = [15, 25, 30, 45, 60, 90];

export const UNDERSTANDING_OPTIONS: Array<{ value: Understanding; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'partly', label: 'Partly' },
  { value: 'no', label: 'No' },
];

interface Props {
  open: boolean;
  session: StudySession | null;
  defaultSubjectId?: string;
  defaultTopicId?: string;
  onClose: () => void;
}

export function SessionForm({ open, session, defaultSubjectId, defaultTopicId, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [minutes, setMinutes] = useState('');
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<string>('');
  const [understanding, setUnderstanding] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (session) {
      setSubjectId(session.subjectId);
      setTopicId(session.topicId ?? '');
      setDate(session.date);
      setMinutes(String(session.minutes));
      setNote(session.note);
      setConfidence(session.confidence === null ? '' : String(session.confidence));
      setUnderstanding(session.understanding ?? '');
    } else {
      const topic = defaultTopicId ? data.topics.find((t) => t.id === defaultTopicId) : null;
      setSubjectId(topic?.subjectId || defaultSubjectId || data.subjects[0]?.id || '');
      setTopicId(defaultTopicId ?? '');
      setDate(todayISO());
      setMinutes(String(data.settings.defaultSessionMinutes));
      setNote('');
      setConfidence('');
      setUnderstanding('');
    }
  }, [open, session, defaultSubjectId, defaultTopicId, data.subjects, data.topics, data.settings.defaultSessionMinutes]);

  const topics = useMemo(
    () => data.topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.order - b.order),
    [data.topics, subjectId],
  );

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
      topicId: topicId || null,
      date: date || todayISO(),
      minutes: Math.round(mins as number),
      note: note.trim(),
      confidence: confidence ? Number(confidence) : null,
      understanding: (understanding || null) as Understanding | null,
    };

    if (session) {
      actions.updateSession(session.id, payload);
      toast.success('Session updated');
    } else {
      actions.addSession(payload);
      const name = data.subjects.find((s) => s.id === subjectId)?.name ?? 'Session';
      toast.success(`${name} — ${formatMinutes(payload.minutes)} logged`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={session ? 'Edit study session' : 'Log study time'}
      subtitle="Linking a topic updates its mastery and schedules the next review."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!data.subjects.length}>
            {session ? 'Save changes' : 'Log time'}
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

          <SelectField
            label="Topic"
            hint="optional"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
          >
            <option value="">No specific topic</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} ` : ''}
                {t.name}
              </option>
            ))}
          </SelectField>

          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <TextField
            label="Duration"
            hint="minutes"
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
            {QUICK.map((m) => (
              <button
                key={m}
                type="button"
                className="chip"
                aria-pressed={minutes === String(m)}
                onClick={() => setMinutes(String(m))}
              >
                {formatMinutes(m)}
              </button>
            ))}
          </div>

          <SelectField
            label="Confidence after"
            hint="optional, 1-5"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
          >
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Did you understand it?"
            hint="optional"
            value={understanding}
            onChange={(e) => setUnderstanding(e.target.value)}
          >
            <option value="">Not answered</option>
            {UNDERSTANDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>

          <TextAreaField
            className="span-2"
            label="Note"
            hint="optional"
            placeholder="What you worked on"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>
      )}
    </Modal>
  );
}
