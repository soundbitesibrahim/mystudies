/** Dashboard 2 — "What needs me most?" */

import React from 'react';
import { useDerived } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { PriorityBadge, TrendIndicator, toneClass } from '../components/ui/Indicators';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { concernReasons, positiveReasons, PRIORITY_META } from '../lib/priority';
import { formatMinutes } from '../lib/utils';
import type { SubjectView } from '../state/derived';

export function FocusPage() {
  const { ranked, subjectViews } = useDerived();
  const { openSubject, openAssessment, openLog } = useUi();

  if (!subjectViews.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="target"
            title="Nothing to focus on yet"
            text="Add your subjects and record how you are doing. This page will then rank exactly where your attention is needed."
            actionLabel="Add subject"
            onAction={() => openSubject()}
          />
        </div>
      </div>
    );
  }

  const needsAttention = ranked.filter((v) => v.priority.level !== 'maintain');
  const steady = ranked.filter((v) => v.priority.level === 'maintain');

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section enter" style={{ ['--i' as string]: 0 }}>
          <div className="section__head">
            <div>
              <p className="eyebrow">My main focus</p>
              <h2 style={{ fontSize: '1.45rem', marginTop: 6 }}>
                {needsAttention.length ? 'What needs me most' : 'Everything is holding steady'}
              </h2>
              <p className="section__hint">
                {needsAttention.length
                  ? `${needsAttention.length} of ${subjectViews.length} subjects are asking for attention, strongest first.`
                  : 'No subject is currently below where it should be. Keep your routine going.'}
              </p>
            </div>
          </div>
        </section>

        {needsAttention.length === 0 ? (
          <div className="panel enter" style={{ ['--i' as string]: 1 }}>
            <EmptyState
              icon="check"
              title="No subject needs urgent attention"
              text="Every subject you track is at or above a comfortable standing. Log study time and results to keep this accurate."
            />
          </div>
        ) : (
          <div className="stack stack--tight">
            {needsAttention.map((view, index) => (
              <FocusCard
                key={view.subject.id}
                view={view}
                index={index}
                onEdit={() => openSubject(view.subject)}
                onAssessment={() => openAssessment(null, view.subject.id)}
                onLog={() => openLog(null, view.subject.id)}
              />
            ))}
          </div>
        )}

        {steady.length > 0 && (
          <section className="section enter" style={{ ['--i' as string]: 4 }}>
            <div className="section__head">
              <h2>
                Holding steady
                <span className="badge badge--maintain">{steady.length}</span>
              </h2>
            </div>
            <div className="panel">
              {steady.map((view, i) => (
                <div
                  key={view.subject.id}
                  className="list-row enter--fast"
                  style={{ ['--i' as string]: i }}
                >
                  <span className="list-row__main">
                    <span className="cell-name">{view.subject.name}</span>
                    <span className="cell-sub">
                      {positiveReasons(view.priority)[0]?.text ?? 'No concerns flagged.'}
                    </span>
                  </span>
                  <span className="list-row__side">
                    <TrendIndicator
                      direction={view.trend.direction}
                      delta={view.trend.delta}
                      note={view.trend.note}
                      showLabel={false}
                    />
                    <span className={`num ${toneClass(view.health.score)}`} style={{ fontWeight: 620 }}>
                      {view.health.score ?? '—'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function FocusCard({
  view,
  index,
  onEdit,
  onAssessment,
  onLog,
}: {
  view: SubjectView;
  index: number;
  onEdit: () => void;
  onAssessment: () => void;
  onLog: () => void;
}) {
  const { subject, health, priority, trend } = view;
  const concerns = concernReasons(priority);
  const meta = PRIORITY_META[priority.level];

  return (
    <article
      className={`focus-card focus-card--${priority.level} enter`}
      style={{ ['--i' as string]: index }}
    >
      <div className="focus-card__rank">
        <span className="focus-card__icon" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="focus-card__index num">{String(index + 1).padStart(2, '0')}</span>
      </div>

      <div className="focus-card__body">
        <div className="focus-card__title">
          <h3 className="focus-card__name">{subject.name}</h3>
          <PriorityBadge level={priority.level} />
          {priority.overridden && <span className="badge badge--neutral">Manual</span>}
          <span className="spacer" />
          <TrendIndicator direction={trend.direction} delta={trend.delta} note={trend.note} />
        </div>

        <div className="row row--wrap" style={{ gap: 18 }}>
          <span className="focus-card__score">
            Standing{' '}
            <strong className={toneClass(health.score)} style={{ fontSize: '1.1rem' }}>
              <AnimatedNumber value={health.score} duration={800} />
            </strong>
            <span className="faint"> / 100</span>
          </span>
          {health.targetGap !== null && health.targetGap > 0 && (
            <span className="focus-card__score">
              Target gap <strong className="tone-warn">{health.targetGap} pts</strong>
            </span>
          )}
          {view.weekMinutes > 0 && (
            <span className="focus-card__score">
              This week <strong>{formatMinutes(view.weekMinutes)}</strong>
            </span>
          )}
        </div>

        {concerns.length > 0 && (
          <div>
            <p className="eyebrow" style={{ marginBottom: 7 }}>
              Why
            </p>
            <ul className="reasons">
              {concerns.map((reason, i) => (
                <li
                  key={`${reason.kind}-${i}`}
                  className={`reason enter--fast reason--${priority.level}`}
                  style={{ ['--i' as string]: i }}
                >
                  <span className="reason__bullet" aria-hidden="true" />
                  <span>{reason.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {subject.weakness && (
          <div className="quote">
            <span className="quote__label">Main issue</span>
            {subject.weakness}
          </div>
        )}

        <div className="row row--wrap" style={{ gap: 8 }}>
          <Button size="sm" icon="clock" onClick={onLog}>
            Log study time
          </Button>
          <Button size="sm" icon="clipboard" onClick={onAssessment}>
            Add assessment
          </Button>
          <Button size="sm" variant="ghost" icon="edit" onClick={onEdit}>
            Edit subject
          </Button>
        </div>
      </div>
    </article>
  );
}
