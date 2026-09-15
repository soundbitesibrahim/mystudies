/** Topic detail: mastery, confidence, weighting, notes and review schedule. */

import React, { useEffect, useState } from 'react';
import type { MasteryState } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField } from '../ui/Field';
import { MasteryBadge, Meter, scoreTone } from '../ui/Indicators';
import { useActions, useDerived, useStore } from '../../state/store';
import { useUi } from '../../state/ui';
import { useToast } from '../ui/Toast';
import { MASTERY_META, MASTERY_STATES } from '../../lib/mastery';
import { formatDate, parseNumberOrNull, relativeDays } from '../../lib/utils';

interface Props {
  open: boolean;
  topicId: string | null;
  onClose: () => void;
}

export function TopicDialog({ open, topicId, onClose }: Props) {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const toast = useToast();
  const ui = useUi();

  const view = topicId ? derived.topicById.get(topicId) : null;
  const [state, setState] = useState<MasteryState>('not-started');
  const [masteryPercent, setMasteryPercent] = useState('');
  const [confidence, setConfidence] = useState('');
  const [difficulty, setDifficulty] = useState('2');
  const [importance, setImportance] = useState('2');
  const [notes, setNotes] = useState('');
  const [weakness, setWeakness] = useState('');
  const [nextRevision, setNextRevision] = useState('');

  useEffect(() => {
    if (!open || !view) return;
    const t = view.topic;
    setState(t.state);
    setMasteryPercent(t.masteryPercent === null ? '' : String(t.masteryPercent));
    setConfidence(t.confidence === null ? '' : String(t.confidence));
    setDifficulty(String(t.difficulty));
    setImportance(String(t.importance));
    setNotes(t.notes);
    setWeakness(t.weakness);
    setNextRevision(t.nextRevision ?? '');
  }, [open, view]);

  if (!view) {
    return <Modal open={open} title="Topic" onClose={onClose}><p className="muted">Topic not found.</p></Modal>;
  }

  const { topic, mastery, revision } = view;

  const save = () => {
    actions.updateTopic(topic.id, {
      state,
      masteryPercent: parseNumberOrNull(masteryPercent),
      confidence: confidence ? Number(confidence) : null,
      difficulty: Number(difficulty),
      importance: Number(importance),
      notes: notes.trim(),
      weakness: weakness.trim(),
      nextRevision: nextRevision || null,
    });
    toast.success(`${topic.name} updated`);
    onClose();
  };

  return (
    <Modal
      open={open}
      size="lg"
      title={topic.name}
      subtitle={`${view.subjectName} · ${view.chapterName}${topic.code ? ` · ${topic.code}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <Button
            size="sm"
            icon="clock"
            onClick={() => {
              onClose();
              ui.openSession(null, topic.subjectId, topic.id);
            }}
          >
            Log study time
          </Button>
          <span className="spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="stack stack--tight" style={{ marginBottom: 18 }}>
        <div className="row row--wrap" style={{ gap: 10 }}>
          <MasteryBadge state={topic.state} />
          <span className="badge">{revision.label}</span>
          {mastery.assessed !== null && (
            <span className="badge">
              {mastery.assessed}% across {mastery.results} {mastery.results === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className={`num ${scoreTone(mastery.value) === 'none' ? 'faint' : `tone-${scoreTone(mastery.value)}`}`} style={{ fontWeight: 620, minWidth: 44 }}>
            {mastery.value}%
          </span>
          <span style={{ flex: 1 }}>
            <Meter value={mastery.value} tone={scoreTone(mastery.value)} label={`${topic.name} mastery`} />
          </span>
        </div>
        <p className="faint" style={{ fontSize: '0.75rem' }}>
          Last studied {relativeDays(topic.lastStudied)} · last revised {relativeDays(topic.lastRevised)}
          {topic.nextRevision ? ` · next review ${formatDate(topic.nextRevision)}` : ''}
        </p>
      </div>

      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <SelectField label="Mastery state" value={state} onChange={(e) => setState(e.target.value as MasteryState)}>
          {MASTERY_STATES.map((s) => (
            <option key={s} value={s}>
              {MASTERY_META[s].label}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Mastery percentage"
          hint="optional override"
          type="number"
          min={0}
          max={100}
          placeholder={String(MASTERY_META[state].band)}
          value={masteryPercent}
          onChange={(e) => setMasteryPercent(e.target.value)}
        />

        <SelectField label="Confidence" hint="1-5" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
          <option value="">Not rated</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Next revision"
          hint="optional"
          type="date"
          value={nextRevision}
          onChange={(e) => setNextRevision(e.target.value)}
        />

        <SelectField label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="1">Straightforward</option>
          <option value="2">Moderate</option>
          <option value="3">Hard</option>
        </SelectField>

        <SelectField label="Exam importance" value={importance} onChange={(e) => setImportance(e.target.value)}>
          <option value="1">Minor</option>
          <option value="2">Normal</option>
          <option value="3">Heavily examined</option>
        </SelectField>

        <TextAreaField
          className="span-2"
          label="What do you struggle with here?"
          hint="optional"
          placeholder="e.g. converting between moles and mass"
          value={weakness}
          maxLength={500}
          onChange={(e) => setWeakness(e.target.value)}
        />

        <TextAreaField
          className="span-2"
          label="Notes"
          hint="optional"
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
      </form>
    </Modal>
  );
}
