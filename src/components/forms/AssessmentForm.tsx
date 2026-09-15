/** Record a test or exam result. Percentage is calculated as you type. */

import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { gradeFromPercent } from '../../lib/grades';
import { parseNumberOrNull, todayISO } from '../../lib/utils';

interface AssessmentFormProps {
  open: boolean;
  assessment: Assessment | null;
  /** Pre-selected subject when opened from a subject context. */
  defaultSubjectId?: string;
  onClose: () => void;
}

interface FormState {
  subjectId: string;
  name: string;
  date: string;
  score: string;
  maxScore: string;
  note: string;
}

export function AssessmentForm({ open, assessment, defaultSubjectId, onClose }: AssessmentFormProps) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => ({
    subjectId: '',
    name: '',
    date: todayISO(),
    score: '',
    maxScore: '100',
    note: '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (assessment) {
      setForm({
        subjectId: assessment.subjectId,
        name: assessment.name,
        date: assessment.date,
        score: String(assessment.score),
        maxScore: String(assessment.maxScore),
        note: assessment.note,
      });
    } else {
      setForm({
        subjectId: defaultSubjectId || data.subjects[0]?.id || '',
        name: '',
        date: todayISO(),
        score: '',
        maxScore: '100',
        note: '',
      });
    }
  }, [open, assessment, defaultSubjectId, data.subjects]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const preview = useMemo(() => {
    const score = parseNumberOrNull(form.score);
    const max = parseNumberOrNull(form.maxScore);
    if (score === null || max === null || max <= 0) return null;
    return (score / max) * 100;
  }, [form.score, form.maxScore]);

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.subjectId) next.subjectId = 'Choose a subject';
    if (!form.name.trim()) next.name = 'Name this assessment';
    const score = parseNumberOrNull(form.score);
    const max = parseNumberOrNull(form.maxScore);
    if (score === null || score < 0) next.score = 'Enter your score';
    if (max === null || max <= 0) next.maxScore = 'Maximum must be above 0';
    if (score !== null && max !== null && max > 0 && score > max) next.score = 'Score is above the maximum';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      subjectId: form.subjectId,
      name: form.name.trim(),
      date: form.date || todayISO(),
      score: score as number,
      maxScore: max as number,
      note: form.note.trim(),
    };

    if (assessment) {
      actions.updateAssessment(assessment.id, payload);
      toast.success('Assessment updated');
    } else {
      actions.addAssessment(payload);
      toast.success(`${payload.name} recorded`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={assessment ? 'Edit assessment' : 'Add assessment'}
      subtitle="Results feed straight into your status and priorities."
      onClose={onClose}
      footer={
        <>
          <span className="muted num" style={{ fontSize: '0.85rem' }}>
            {preview === null ? 'Enter a score to see the percentage' : `${preview.toFixed(1)}% · ${gradeFromPercent(preview)}`}
          </span>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!data.subjects.length}>
            {assessment ? 'Save changes' : 'Add assessment'}
          </Button>
        </>
      }
    >
      {!data.subjects.length ? (
        <p className="muted">Add a subject first — assessments always belong to a subject.</p>
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
            value={form.subjectId}
            error={errors.subjectId}
            onChange={(e) => set('subjectId', e.target.value)}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />

          <TextField
            className="span-2"
            label="Assessment name"
            placeholder="e.g. Unit 3 test"
            value={form.name}
            error={errors.name}
            maxLength={120}
            onChange={(e) => set('name', e.target.value)}
          />

          <TextField
            label="Score"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="82"
            value={form.score}
            error={errors.score}
            onChange={(e) => set('score', e.target.value)}
          />

          <TextField
            label="Maximum score"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            placeholder="100"
            value={form.maxScore}
            error={errors.maxScore}
            onChange={(e) => set('maxScore', e.target.value)}
          />

          <TextAreaField
            className="span-2"
            label="Note"
            hint="optional"
            placeholder="What went well, what did not"
            value={form.note}
            maxLength={400}
            onChange={(e) => set('note', e.target.value)}
          />

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>
      )}
    </Modal>
  );
}
