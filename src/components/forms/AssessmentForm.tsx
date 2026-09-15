/** Record a result, optionally broken down by syllabus topic. */

import React, { useEffect, useMemo, useState } from 'react';
import type { Assessment, AssessmentTopicResult, AssessmentType } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button, IconButton } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { gradeFromPercent } from '../../lib/grades';
import { parseNumberOrNull, todayISO } from '../../lib/utils';

const TYPES: Array<{ value: AssessmentType; label: string }> = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'homework', label: 'Homework' },
  { value: 'class-test', label: 'Class test' },
  { value: 'mock-exam', label: 'Mock exam' },
  { value: 'past-paper', label: 'Past paper' },
  { value: 'exam', label: 'Exam' },
  { value: 'other', label: 'Other' },
];

export const ASSESSMENT_TYPE_LABEL = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
) as Record<AssessmentType, string>;

interface Props {
  open: boolean;
  assessment: Assessment | null;
  defaultSubjectId?: string;
  onClose: () => void;
}

interface RowDraft {
  topicId: string;
  score: string;
  maxScore: string;
}

export function AssessmentForm({ open, assessment, defaultSubjectId, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AssessmentType>('class-test');
  const [date, setDate] = useState(todayISO());
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (assessment) {
      setSubjectId(assessment.subjectId);
      setChapterId(assessment.chapterId ?? '');
      setName(assessment.name);
      setType(assessment.type);
      setDate(assessment.date);
      setScore(String(assessment.score));
      setMaxScore(String(assessment.maxScore));
      setNote(assessment.note);
      setRows(
        assessment.topicResults.map((r) => ({
          topicId: r.topicId,
          score: String(r.score),
          maxScore: String(r.maxScore),
        })),
      );
    } else {
      setSubjectId(defaultSubjectId || data.subjects[0]?.id || '');
      setChapterId('');
      setName('');
      setType('class-test');
      setDate(todayISO());
      setScore('');
      setMaxScore('100');
      setNote('');
      setRows([]);
    }
  }, [open, assessment, defaultSubjectId, data.subjects]);

  const chapters = useMemo(
    () => data.chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order),
    [data.chapters, subjectId],
  );
  const topics = useMemo(
    () =>
      data.topics
        .filter((t) => t.subjectId === subjectId && (!chapterId || t.chapterId === chapterId))
        .sort((a, b) => a.order - b.order),
    [data.topics, subjectId, chapterId],
  );

  const preview = useMemo(() => {
    const s = parseNumberOrNull(score);
    const m = parseNumberOrNull(maxScore);
    if (s === null || m === null || m <= 0) return null;
    return (s / m) * 100;
  }, [score, maxScore]);

  const addRow = () => {
    const used = new Set(rows.map((r) => r.topicId));
    const next = topics.find((t) => !used.has(t.id));
    if (!next) return;
    setRows((r) => [...r, { topicId: next.id, score: '', maxScore: '10' }]);
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!subjectId) next.subjectId = 'Choose a subject';
    if (!name.trim()) next.name = 'Name this assessment';
    const s = parseNumberOrNull(score);
    const m = parseNumberOrNull(maxScore);
    if (s === null || s < 0) next.score = 'Enter your score';
    if (m === null || m <= 0) next.maxScore = 'Maximum must be above 0';
    if (s !== null && m !== null && m > 0 && s > m) next.score = 'Score is above the maximum';
    setErrors(next);
    if (Object.keys(next).length) return;

    const topicResults: AssessmentTopicResult[] = rows
      .map((row) => {
        const rs = parseNumberOrNull(row.score);
        const rm = parseNumberOrNull(row.maxScore);
        if (!row.topicId || rs === null || rm === null || rm <= 0) return null;
        return { topicId: row.topicId, score: rs, maxScore: rm };
      })
      .filter((r): r is AssessmentTopicResult => r !== null);

    const payload = {
      subjectId,
      chapterId: chapterId || null,
      name: name.trim(),
      type,
      date: date || todayISO(),
      score: s as number,
      maxScore: m as number,
      note: note.trim(),
      topicResults,
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
      size="lg"
      title={assessment ? 'Edit assessment' : 'Add assessment'}
      subtitle="Link topics to feed topic mastery and the focus engine."
      onClose={onClose}
      footer={
        <>
          <span className="muted num" style={{ fontSize: '0.813rem' }}>
            {preview === null
              ? 'Enter a score to see the percentage'
              : `${preview.toFixed(1)}% · ${gradeFromPercent(preview, data.settings.gradeThresholds)}`}
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
            value={subjectId}
            error={errors.subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId('');
              setRows([]);
            }}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Chapter"
            hint="optional"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            <option value="">Whole subject</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code}. ` : ''}
                {c.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Assessment name"
            placeholder="e.g. Unit 3 test"
            value={name}
            error={errors.name}
            maxLength={140}
            onChange={(e) => setName(e.target.value)}
          />

          <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as AssessmentType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>

          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <TextField
              label="Score"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="82"
              value={score}
              error={errors.score}
              onChange={(e) => setScore(e.target.value)}
            />
            <TextField
              label="Out of"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              placeholder="100"
              value={maxScore}
              error={errors.maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>

          <div className="span-2">
            <div className="row row--between" style={{ marginBottom: 8 }}>
              <span className="field__label" style={{ margin: 0 }}>
                Topic breakdown
                <span className="field__hint">optional — drives topic mastery</span>
              </span>
              <Button size="sm" icon="plus" onClick={addRow} disabled={!topics.length || rows.length >= topics.length}>
                Add topic
              </Button>
            </div>

            {!topics.length ? (
              <p className="faint" style={{ fontSize: '0.781rem' }}>
                This subject has no syllabus topics yet — add them on the Syllabus page to break results down.
              </p>
            ) : !rows.length ? (
              <p className="faint" style={{ fontSize: '0.781rem' }}>
                No topic breakdown. The overall score still counts towards subject performance.
              </p>
            ) : (
              <div className="stack stack--tight">
                {rows.map((row, i) => (
                  <div key={i} className="row" style={{ gap: 8 }}>
                    <label className="sr-only" htmlFor={`row-topic-${i}`}>
                      Topic
                    </label>
                    <select
                      id={`row-topic-${i}`}
                      className="select"
                      value={row.topicId}
                      onChange={(e) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, topicId: e.target.value } : r)))
                      }
                    >
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code ? `${t.code} ` : ''}
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`row-score-${i}`}>
                      Score for this topic
                    </label>
                    <input
                      id={`row-score-${i}`}
                      className="input"
                      style={{ width: 74 }}
                      type="number"
                      min={0}
                      step="any"
                      placeholder="7"
                      value={row.score}
                      onChange={(e) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, score: e.target.value } : r)))
                      }
                    />
                    <span className="faint">/</span>
                    <label className="sr-only" htmlFor={`row-max-${i}`}>
                      Maximum for this topic
                    </label>
                    <input
                      id={`row-max-${i}`}
                      className="input"
                      style={{ width: 74 }}
                      type="number"
                      min={1}
                      step="any"
                      placeholder="10"
                      value={row.maxScore}
                      onChange={(e) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, maxScore: e.target.value } : r)))
                      }
                    />
                    <IconButton
                      icon="trash"
                      label="Remove topic row"
                      onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <TextAreaField
            className="span-2"
            label="Note"
            hint="optional"
            placeholder="What went well, what did not"
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
