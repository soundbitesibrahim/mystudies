/** Subject management, with the personal rating editable inline. */

import React from 'react';
import { useActions, useDerived } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button, IconButton } from '../components/ui/Button';
import { Meter, PriorityBadge, TrendIndicator, toneClass } from '../components/ui/Indicators';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { describePerformance } from '../lib/grades';
import { formatMinutes, pluralize } from '../lib/utils';
import type { SubjectView } from '../state/derived';

export function SubjectsPage() {
  const { subjectViews } = useDerived();
  const { openSubject } = useUi();

  if (!subjectViews.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="book"
            title="No subjects yet"
            text="Add your subjects to begin tracking your academic status."
            actionLabel="Add subject"
            onAction={() => openSubject()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section">
          <div className="section__head">
            <div>
              <h2>
                Your subjects
                <span className="badge badge--neutral">{subjectViews.length}</span>
              </h2>
              <p className="section__hint">
                Drag a rating to update it instantly — every dashboard recalculates as you go.
              </p>
            </div>
            <Button variant="primary" size="sm" icon="plus" onClick={() => openSubject()}>
              Add subject
            </Button>
          </div>

          <div className="grid grid--2">
            {subjectViews.map((view, i) => (
              <SubjectCard key={view.subject.id} view={view} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SubjectCard({ view, index }: { view: SubjectView; index: number }) {
  const { subject, health, trend, priority, assessments } = view;
  const actions = useActions();
  const { openSubject, openAssessment, openLog, askConfirm } = useUi();

  const rating = subject.rating;
  const fill = rating === null ? 0 : rating;

  return (
    <article className="card card--interactive enter" style={{ ['--i' as string]: index }}>
      <div className="card__head">
        <div style={{ minWidth: 0 }}>
          <h3 className="card__title">{subject.name}</h3>
          <p className="cell-sub">
            {describePerformance(health.performancePercent, subject.currentGrade)}
            {health.targetPercent !== null && ` · target ${Math.round(health.targetPercent)}%`}
          </p>
        </div>
        <div className="card__actions">
          <IconButton
            icon="clipboard"
            label={`Add assessment for ${subject.name}`}
            onClick={() => openAssessment(null, subject.id)}
          />
          <IconButton
            icon="clock"
            label={`Log study time for ${subject.name}`}
            onClick={() => openLog(null, subject.id)}
          />
          <IconButton icon="edit" label={`Edit ${subject.name}`} onClick={() => openSubject(subject)} />
          <IconButton
            icon="trash"
            label={`Delete ${subject.name}`}
            onClick={() =>
              askConfirm({
                title: `Delete ${subject.name}?`,
                message:
                  'This also removes its assessments, study time and goals. This cannot be undone.',
                confirmLabel: 'Delete subject',
                onConfirm: () => actions.deleteSubject(subject.id),
              })
            }
          />
        </div>
      </div>

      <div className="row row--wrap" style={{ gap: 10 }}>
        <PriorityBadge level={priority.level} compact />
        <TrendIndicator direction={trend.direction} delta={trend.delta} note={trend.note} />
      </div>

      <div>
        <div className="row row--between" style={{ marginBottom: 6 }}>
          <span className="field__label" style={{ margin: 0 }}>
            <label htmlFor={`rating-${subject.id}`}>Personal rating</label>
          </span>
          <span className="rating-value num">{rating === null ? 'Not rated' : rating}</span>
        </div>
        <div className="subject-row-rating">
          <input
            id={`rating-${subject.id}`}
            type="range"
            className="slider"
            min={0}
            max={100}
            value={rating ?? 50}
            style={{ ['--fill' as string]: `${fill}%` }}
            aria-valuetext={rating === null ? 'Not rated' : `${rating} out of 100`}
            onChange={(e) => actions.updateSubject(subject.id, { rating: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <div className="row row--between" style={{ marginBottom: 6 }}>
          <span className="cell-sub">Standing</span>
          <span className={`num ${toneClass(health.score)}`} style={{ fontWeight: 620 }}>
            <AnimatedNumber value={health.score} duration={600} />
            <span className="faint"> / 100</span>
          </span>
        </div>
        <Meter
          value={health.score ?? 0}
          tone={
            health.score === null ? undefined : health.score >= 75 ? 'good' : health.score >= 55 ? 'warn' : 'bad'
          }
          label={`${subject.name} standing`}
        />
      </div>

      {subject.weakness && (
        <div className="quote">
          <span className="quote__label">Main issue</span>
          {subject.weakness}
        </div>
      )}

      <div className="row row--wrap faint card__foot" style={{ gap: 14, fontSize: '0.78rem' }}>
        <span>
          {assessments.count} {pluralize(assessments.count, 'assessment')}
        </span>
        <span>·</span>
        <span>{formatMinutes(view.totalMinutes)} logged</span>
      </div>
    </article>
  );
}
