/** An upcoming exam, and the topics it covers. */

import React, { useEffect, useMemo, useState } from 'react';
import type { Exam, Grade } from '../../lib/types';
import { GRADES } from '../../lib/grades';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { parseNumberOrNull, todayISO } from '../../lib/utils';

interface Props {
  open: boolean;
  exam: Exam | null;
  defaultSubjectId?: string;
  onClose: () => void;
}

export function ExamForm({ open, exam, defaultSubjectId, onClose }: Props) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [targetGrade, setTargetGrade] = useState('');
  const [targetPercent, setTargetPercent] = useState('');
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (exam) {
      setSubjectId(exam.subjectId);
      setName(exam.name);
      setDate(exam.date);
      setTargetGrade(exam.targetGrade ?? '');
      setTargetPercent(exam.targetPercent === null ? '' : String(exam.targetPercent));
      setTopicIds(exam.topicIds);
      setNote(exam.note);
    } else {
      setSubjectId(defaultSubjectId || data.subjects[0]?.id || '');
      setName('');
      setDate(todayISO());
      setTargetGrade('A');
      setTargetPercent('');
      setTopicIds([]);
      setNote('');
    }
  }, [open, exam, defaultSubjectId, data.subjects]);

  const chapters = useMemo(
    () => data.chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order),
    [data.chapters, subjectId],
  );

  const toggleTopic = (id: string) =>
    setTopicIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const toggleChapter = (chapterId: string) => {
    const ids = data.topics.filter((t) => t.chapterId === chapterId).map((t) => t.id);
    const allOn = ids.every((id) => topicIds.includes(id));
    setTopicIds((current) =>
      allOn ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    );
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!subjectId) next.subjectId = 'Choose a subject';
    if (!name.trim()) next.name = 'Name this exam';
    const percent = parseNumberOrNull(targetPercent);
    if (targetPercent.trim() !== '' && (percent === null || percent < 0 || percent > 100)) {
      next.targetPercent = 'Must be between 0 and 100';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      subjectId,
      name: name.trim(),
      date: date || todayISO(),
      targetGrade: (targetGrade || null) as Grade | null,
      targetPercent: percent,
      topicIds,
      note: note.trim(),
    };

    if (exam) {
      actions.updateExam(exam.id, payload);
      toast.success('Exam updated');
    } else {
      actions.addExam(payload);
      toast.success(`${payload.name} added`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      size="lg"
      title={exam ? 'Edit exam' : 'Add exam'}
      subtitle="Linked topics get more priority as the date approaches."
      onClose={onClose}
      footer={
        <>
          <span className="muted" style={{ fontSize: '0.813rem' }}>
            {topicIds.length ? `${topicIds.length} topics selected` : 'Covers the whole subject'}
          </span>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!data.subjects.length}>
            {exam ? 'Save changes' : 'Add exam'}
          </Button>
        </>
      }
    >
      {!data.subjects.length ? (
        <p className="muted">Add a subject first — exams always belong to a subject.</p>
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
              setTopicIds([]);
            }}
          >
            {data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Exam name"
            placeholder="e.g. Chemistry mock"
            value={name}
            error={errors.name}
            maxLength={140}
            onChange={(e) => setName(e.target.value)}
          />

          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <SelectField
            label="Target grade"
            hint="optional"
            value={targetGrade}
            onChange={(e) => setTargetGrade(e.target.value)}
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
            min={0}
            max={100}
            placeholder="—"
            value={targetPercent}
            error={errors.targetPercent}
            onChange={(e) => setTargetPercent(e.target.value)}
          />

          <div className="span-2">
            <span className="field__label" style={{ marginBottom: 6 }}>
              Topics covered
              <span className="field__hint">leave empty for the whole subject</span>
            </span>
            {!chapters.length ? (
              <p className="faint" style={{ fontSize: '0.781rem' }}>
                This subject has no syllabus yet — add chapters on the Syllabus page.
              </p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                {chapters.map((chapter) => {
                  const chapterTopics = data.topics
                    .filter((t) => t.chapterId === chapter.id)
                    .sort((a, b) => a.order - b.order);
                  const allOn = chapterTopics.length > 0 && chapterTopics.every((t) => topicIds.includes(t.id));
                  return (
                    <div key={chapter.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <label className="row" style={{ padding: '8px 12px', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={allOn} onChange={() => toggleChapter(chapter.id)} />
                        <span style={{ fontWeight: 560, fontSize: '0.844rem' }}>
                          {chapter.code ? `${chapter.code}. ` : ''}
                          {chapter.name}
                        </span>
                      </label>
                      {chapterTopics.map((topic) => (
                        <label
                          key={topic.id}
                          className="row"
                          style={{ padding: '5px 12px 5px 34px', gap: 8, cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={topicIds.includes(topic.id)}
                            onChange={() => toggleTopic(topic.id)}
                          />
                          <span style={{ fontSize: '0.813rem' }}>
                            {topic.code && <span className="mono faint">{topic.code} </span>}
                            {topic.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <TextAreaField
            className="span-2"
            label="Note"
            hint="optional"
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
