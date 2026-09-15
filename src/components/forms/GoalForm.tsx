/** Goals for a subject or overall: grade, percentage, syllabus, study time or an exam. */

import React, { useEffect, useState } from 'react';
import type { Goal, GoalKind, GoalScope, Grade } from '../../lib/types';
import { GRADES } from '../../lib/grades';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { goalKindLabel } from '../../lib/goals';
import { parseNumberOrNull } from '../../lib/utils';

const KINDS: GoalKind[] = ['grade', 'percent', 'syllabus', 'study-time', 'exam'];

interface Props {
  open: boolean;
  goal: Goal | null;
  defaultSubjectId?: string;
  onClose: () => void;
}

export function GoalForm({ open, goal, defaultSubjectId, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [scope, setScope] = useState<GoalScope>('subject');
  const [subjectId, setSubjectId] = useState('');
  const [kind, setKind] = useState<GoalKind>('grade');
  const [targetGrade, setTargetGrade] = useState('A');
  const [targetPercent, setTargetPercent] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [examId, setExamId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (goal) {
      setScope(goal.scope);
      setSubjectId(goal.subjectId ?? '');
      setKind(goal.kind);
      setTargetGrade(goal.targetGrade ?? 'A');
      setTargetPercent(goal.targetPercent === null ? '' : String(goal.targetPercent));
      setTargetMinutes(goal.targetMinutes === null ? '' : String(goal.targetMinutes));
      setExamId(goal.examId ?? '');
      setDeadline(goal.deadline);
      setNote(goal.note);
    } else {
      setScope(data.subjects.length ? 'subject' : 'overall');
      setSubjectId(defaultSubjectId || data.subjects[0]?.id || '');
      setKind('grade');
      setTargetGrade('A');
      setTargetPercent('');
      setTargetMinutes('180');
      setExamId('');
      setDeadline('');
      setNote('');
    }
  }, [open, goal, defaultSubjectId, data.subjects]);

  const exams = data.exams.filter((e) => scope === 'overall' || e.subjectId === subjectId);

  const submit = () => {
    const next: Record<string, string> = {};
    if (scope === 'subject' && !subjectId) next.subjectId = 'Choose a subject';

    const percent = parseNumberOrNull(targetPercent);
    const mins = parseNumberOrNull(targetMinutes);

    if (kind === 'percent' || kind === 'syllabus') {
      if (percent === null) next.targetPercent = 'Enter a target percentage';
      else if (percent < 0 || percent > 100) next.targetPercent = 'Must be between 0 and 100';
    }
    if (kind === 'study-time' && (mins === null || mins <= 0)) {
      next.targetMinutes = 'Enter minutes per week';
    }
    if ((kind === 'grade' || kind === 'exam') && !targetGrade) next.targetGrade = 'Choose a grade';
    if (kind === 'exam' && !examId) next.examId = 'Choose an exam';

    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      scope,
      subjectId: scope === 'subject' ? subjectId : null,
      kind,
      targetPercent: kind === 'percent' || kind === 'syllabus' ? percent : null,
      targetGrade: kind === 'grade' || kind === 'exam' ? (targetGrade as Grade) : null,
      targetMinutes: kind === 'study-time' ? Math.round(mins as number) : null,
      examId: kind === 'exam' ? examId : null,
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
        <SelectField label="Applies to" value={scope} onChange={(e) => setScope(e.target.value as GoalScope)}>
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
            <p className="muted" style={{ fontSize: '0.813rem', paddingTop: 7 }}>
              Measured across every subject.
            </p>
          </div>
        )}

        <SelectField label="Goal type" value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
          {KINDS.map((k) => (
            <option key={k} value={k} disabled={k === 'exam' && !data.exams.length}>
              {goalKindLabel(k)}
            </option>
          ))}
        </SelectField>

        {(kind === 'grade' || kind === 'exam') && (
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
        )}

        {(kind === 'percent' || kind === 'syllabus') && (
          <TextField
            label={kind === 'syllabus' ? 'Target coverage' : 'Target percentage'}
            hint="%"
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

        {kind === 'study-time' && (
          <TextField
            label="Target per week"
            hint="minutes"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="180"
            value={targetMinutes}
            error={errors.targetMinutes}
            onChange={(e) => setTargetMinutes(e.target.value)}
          />
        )}

        {kind === 'exam' && (
          <SelectField
            className="span-2"
            label="Exam"
            value={examId}
            error={errors.examId}
            onChange={(e) => setExamId(e.target.value)}
          >
            <option value="">Choose an exam</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.date}
              </option>
            ))}
          </SelectField>
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
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
        />

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
