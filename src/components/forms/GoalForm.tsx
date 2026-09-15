/** Set an academic goal for a subject or for your overall standing. */

import React, { useEffect, useState } from 'react';
import type { Goal, GoalScope, GoalTargetType, Grade } from '../../lib/types';
import { GRADES } from '../../lib/grades';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { parseNumberOrNull } from '../../lib/utils';

interface GoalFormProps {
  open: boolean;
  goal: Goal | null;
  defaultSubjectId?: string;
  onClose: () => void;
}

export function GoalForm({ open, goal, defaultSubjectId, onClose }: GoalFormProps) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [scope, setScope] = useState<GoalScope>('subject');
  const [subjectId, setSubjectId] = useState('');
  const [targetType, setTargetType] = useState<GoalTargetType>('grade');
  const [targetGrade, setTargetGrade] = useState<string>('A');
  const [targetPercent, setTargetPercent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (goal) {
      setScope(goal.scope);
      setSubjectId(goal.subjectId ?? '');
      setTargetType(goal.targetType);
      setTargetGrade(goal.targetGrade ?? 'A');
      setTargetPercent(goal.targetPercent === null ? '' : String(goal.targetPercent));
      setDeadline(goal.deadline);
      setNote(goal.note);
    } else {
      setScope(data.subjects.length ? 'subject' : 'overall');
      setSubjectId(defaultSubjectId || data.subjects[0]?.id || '');
      setTargetType('grade');
      setTargetGrade('A');
      setTargetPercent('');
      setDeadline('');
      setNote('');
    }
  }, [open, goal, defaultSubjectId, data.subjects]);

  const submit = () => {
    const next: Record<string, string> = {};
    if (scope === 'subject' && !subjectId) next.subjectId = 'Choose a subject';
    const percent = parseNumberOrNull(targetPercent);
    if (targetType === 'percent') {
      if (percent === null) next.targetPercent = 'Enter a target percentage';
      else if (percent < 0 || percent > 100) next.targetPercent = 'Must be between 0 and 100';
    }
    if (targetType === 'grade' && !targetGrade) next.targetGrade = 'Choose a target grade';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      scope,
      subjectId: scope === 'subject' ? subjectId : null,
      targetType,
      targetPercent: targetType === 'percent' ? percent : null,
      targetGrade: targetType === 'grade' ? (targetGrade as Grade) : null,
      deadline,
      note: note.trim(),
    };

    if (goal) {
      actions.updateGoal(goal.id, payload);
      toast.success('Goal updated');
    } else {
      actions.addGoal(payload);
      toast.success('Goal added');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={goal ? 'Edit goal' : 'Add goal'}
      subtitle="A target to measure the gap against."
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            {goal ? 'Save changes' : 'Add goal'}
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
        <SelectField
          label="Applies to"
          value={scope}
          onChange={(e) => setScope(e.target.value as GoalScope)}
        >
          <option value="subject" disabled={!data.subjects.length}>
            A subject
          </option>
          <option value="overall">Overall</option>
        </SelectField>

        {scope === 'subject' ? (
          <SelectField
            label="Subject"
            value={subjectId}
            error={errors.subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {!data.subjects.length && <option value="">No subjects yet</option>}
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        ) : (
          <div className="field">
            <span className="field__label">Subject</span>
            <p className="muted" style={{ fontSize: '0.85rem', paddingTop: 8 }}>
              Measured across every subject.
            </p>
          </div>
        )}

        <SelectField
          label="Target type"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as GoalTargetType)}
        >
          <option value="grade">Letter grade</option>
          <option value="percent">Percentage</option>
        </SelectField>

        {targetType === 'grade' ? (
          <SelectField
            label="Target grade"
            value={targetGrade}
            error={errors.targetGrade}
            onChange={(e) => setTargetGrade(e.target.value)}
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField
            label="Target percentage"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            placeholder="90"
            value={targetPercent}
            error={errors.targetPercent}
            onChange={(e) => setTargetPercent(e.target.value)}
          />
        )}

        <TextField
          label="Deadline"
          hint="optional"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <TextAreaField
          className="span-2"
          label="Note"
          hint="optional"
          placeholder="Why this goal matters"
          value={note}
          maxLength={400}
          onChange={(e) => setNote(e.target.value)}
        />

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
