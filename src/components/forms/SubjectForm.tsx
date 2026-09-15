/** Create or edit a subject, optionally seeding its syllabus. */

import React, { useEffect, useState } from 'react';
import type { Grade, PriorityLevel, Subject } from '../../lib/types';
import { GRADES } from '../../lib/grades';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, SliderField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { parseNumberOrNull } from '../../lib/utils';
import { SYLLABUS_SEED, seedForCode, seedForName } from '../../data/syllabus';

const COMMON_REASONS = [
  "I don't understand the concepts",
  'I forget information',
  'I struggle with application questions',
  'I make calculation mistakes',
  'I struggle with writing',
  'I lack confidence',
];

interface Props {
  open: boolean;
  subject: Subject | null;
  onClose: () => void;
}

const blank = {
  name: '',
  code: '',
  rating: null as number | null,
  currentPercent: '',
  currentGrade: '',
  targetPercent: '',
  targetGrade: 'A' as string,
  weakness: '',
  priorityOverride: '',
  seedSyllabus: true,
};

export function SubjectForm({ open, subject, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      subject
        ? {
            name: subject.name,
            code: subject.code,
            rating: subject.rating,
            currentPercent: subject.currentPercent === null ? '' : String(subject.currentPercent),
            currentGrade: subject.currentGrade ?? '',
            targetPercent: subject.targetPercent === null ? '' : String(subject.targetPercent),
            targetGrade: subject.targetGrade ?? '',
            weakness: subject.weakness,
            priorityOverride: subject.priorityOverride ?? '',
            seedSyllabus: false,
          }
        : blank,
    );
  }, [open, subject]);

  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const matchedSeed = subject
    ? null
    : (seedForCode(form.code.trim()) ?? seedForName(form.name.trim()) ?? null);

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
      code: form.code.trim(),
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
      const seed = form.seedSyllabus ? matchedSeed : null;
      actions.addSubject(payload, seed);
      toast.success(
        seed
          ? `${payload.name} added with ${seed.chapters.length} chapters`
          : `${payload.name} added`,
      );
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
          label="Subject name"
          placeholder="e.g. Chemistry"
          value={form.name}
          error={errors.name}
          maxLength={80}
          list="subject-suggestions"
          onChange={(e) => set('name', e.target.value)}
        />
        <datalist id="subject-suggestions">
          {SYLLABUS_SEED.map((s) => (
            <option key={s.code} value={s.name} />
          ))}
        </datalist>

        <TextField
          label="Syllabus code"
          hint="optional"
          placeholder="e.g. 0620"
          value={form.code}
          maxLength={16}
          onChange={(e) => set('code', e.target.value)}
        />

        {!subject && matchedSeed && (
          <div className="span-2 notice">
            <div className="notice__body">
              <label className="row" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.seedSyllabus}
                  onChange={(e) => set('seedSyllabus', e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  Load the <strong>{matchedSeed.name} ({matchedSeed.code})</strong> syllabus outline —{' '}
                  {matchedSeed.chapters.length} chapters,{' '}
                  {matchedSeed.chapters.reduce((a, c) => a + c.topics.length, 0)} topics. {matchedSeed.note}{' '}
                  Check it against your own scheme of work; everything stays editable.
                </span>
              </label>
            </div>
          </div>
        )}

        <SliderField
          className="span-2"
          label="Personal rating"
          hint="How strong do you feel in this subject overall?"
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
          maxLength={500}
          onChange={(e) => set('weakness', e.target.value)}
        />

        <div className="span-2 chip-row">
          {COMMON_REASONS.map((reason) => (
            <button key={reason} type="button" className="chip" onClick={() => set('weakness', reason)}>
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
          <option value="high">Always high</option>
          <option value="medium">Always medium</option>
          <option value="maintain">Always maintain</option>
        </SelectField>

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
