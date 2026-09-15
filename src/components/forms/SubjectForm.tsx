/** Create or edit a subject. */

import React, { useEffect, useState } from 'react';
import type { Grade, PriorityLevel, Subject } from '../../lib/types';
import { GRADES } from '../../lib/grades';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, SliderField, TextAreaField, TextField } from '../ui/Field';
import { useActions } from '../../state/store';
import { useToast } from '../ui/Toast';
import { parseNumberOrNull } from '../../lib/utils';

/** Common reasons, offered as one-tap fills. Free text is always allowed. */
const COMMON_REASONS = [
  "I don't understand the concepts",
  'I forget information',
  'I struggle with application questions',
  'I make calculation mistakes',
  'I struggle with writing',
  'I lack confidence',
];

interface SubjectFormProps {
  open: boolean;
  subject: Subject | null;
  onClose: () => void;
}

interface FormState {
  name: string;
  rating: number | null;
  currentPercent: string;
  currentGrade: string;
  targetPercent: string;
  targetGrade: string;
  weakness: string;
  priorityOverride: string;
}

const blank: FormState = {
  name: '',
  rating: null,
  currentPercent: '',
  currentGrade: '',
  targetPercent: '',
  targetGrade: '',
  weakness: '',
  priorityOverride: '',
};

function toForm(subject: Subject): FormState {
  return {
    name: subject.name,
    rating: subject.rating,
    currentPercent: subject.currentPercent === null ? '' : String(subject.currentPercent),
    currentGrade: subject.currentGrade ?? '',
    targetPercent: subject.targetPercent === null ? '' : String(subject.targetPercent),
    targetGrade: subject.targetGrade ?? '',
    weakness: subject.weakness,
    priorityOverride: subject.priorityOverride ?? '',
  };
}

export function SubjectForm({ open, subject, onClose }: SubjectFormProps) {
  const actions = useActions();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setForm(subject ? toForm(subject) : blank);
    setErrors({});
  }, [open, subject]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const percentError = (raw: string): string | undefined => {
    if (raw.trim() === '') return undefined;
    const n = parseNumberOrNull(raw);
    if (n === null) return 'Enter a number';
    if (n < 0 || n > 100) return 'Must be between 0 and 100';
    return undefined;
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Give the subject a name';
    const cp = percentError(form.currentPercent);
    if (cp) next.currentPercent = cp;
    const tp = percentError(form.targetPercent);
    if (tp) next.targetPercent = tp;
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      rating: form.rating,
      currentPercent: parseNumberOrNull(form.currentPercent),
      currentGrade: (form.currentGrade || null) as Grade | null,
      targetPercent: parseNumberOrNull(form.targetPercent),
      targetGrade: (form.targetGrade || null) as Grade | null,
      weakness: form.weakness.trim(),
      priorityOverride: (form.priorityOverride || null) as PriorityLevel | null,
    };

    if (subject) {
      actions.updateSubject(subject.id, payload);
      toast.success(`${payload.name} updated`);
    } else {
      actions.addSubject(payload);
      toast.success(`${payload.name} added`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={subject ? 'Edit subject' : 'Add subject'}
      subtitle="Only the name is required — fill in the rest whenever you know it."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            {subject ? 'Save changes' : 'Add subject'}
          </Button>
        </>
      }
    >
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <TextField
          className="span-2"
          label="Subject name"
          placeholder="e.g. Chemistry"
          value={form.name}
          error={errors.name}
          maxLength={80}
          onChange={(e) => set('name', e.target.value)}
        />

        <SliderField
          className="span-2"
          label="Personal rating"
          hint="How strong do you feel in this subject right now?"
          value={form.rating}
          onValueChange={(v) => set('rating', v)}
        />

        <TextField
          label="Current percentage"
          hint="optional"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          placeholder="—"
          value={form.currentPercent}
          error={errors.currentPercent}
          onChange={(e) => set('currentPercent', e.target.value)}
        />

        <SelectField
          label="Current grade"
          hint="optional"
          value={form.currentGrade}
          onChange={(e) => set('currentGrade', e.target.value)}
        >
          <option value="">Not set</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Target percentage"
          hint="optional"
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          placeholder="—"
          value={form.targetPercent}
          error={errors.targetPercent}
          onChange={(e) => set('targetPercent', e.target.value)}
        />

        <SelectField
          label="Target grade"
          hint="optional"
          value={form.targetGrade}
          onChange={(e) => set('targetGrade', e.target.value)}
        >
          <option value="">Not set</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <TextAreaField
          className="span-2"
          label="Why is this subject hard right now?"
          hint="optional — shown on My Focus"
          placeholder="Describe the actual difficulty in your own words"
          value={form.weakness}
          maxLength={400}
          onChange={(e) => set('weakness', e.target.value)}
        />

        <div className="span-2 chip-row">
          {COMMON_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              className="badge badge--neutral"
              style={{ cursor: 'pointer' }}
              onClick={() => set('weakness', reason)}
            >
              {reason}
            </button>
          ))}
        </div>

        <SelectField
          className="span-2"
          label="Priority"
          hint="the engine decides unless you override it"
          value={form.priorityOverride}
          onChange={(e) => set('priorityOverride', e.target.value)}
        >
          <option value="">Automatic</option>
          <option value="high">Always high priority</option>
          <option value="medium">Always medium</option>
          <option value="maintain">Always maintain</option>
        </SelectField>

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
