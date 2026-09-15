/** What to study next, why, and full control to change it. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Meter, PriorityMark, scoreTone, toneClass } from '../components/ui/Indicators';
import { TodayPlan } from './parts/TodayPlan';
import { formatMinutes, todayISO } from '../lib/utils';

export function FocusPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const { recommendations, ranked } = derived;

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="target"
            title="Nothing to focus on yet"
            text="Add your subjects and their syllabus, then record how you are doing. This page ranks exactly where your attention is needed."
            actionLabel="Add subject"
            onAction={() => ui.openSubject()}
          />
        </div>
      </div>
    );
  }

  const addToPlan = (index: number) => {
    const rec = recommendations[index];
    if (!rec) return;
    actions.addTask({
      date: todayISO(),
      subjectId: rec.subjectId,
      topicId: rec.topicId,
      minutes: rec.minutes,
      at: '',
      status: 'planned',
      fromEngine: true,
      reasons: rec.reasons.slice(0, 3).map((r) => r.text),
    });
  };

  const attention = ranked.filter((v) => v.priority.level !== 'maintain');

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section enter">
          <TodayPlan />
        </section>

        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <div>
              <h2>Recommended next</h2>
              <p className="section__hint">
                Ranked from your mastery, results, targets, review schedule and upcoming exams. Every
                item lists the rules behind it — take it, change it, or ignore it.
              </p>
            </div>
          </div>

          <div className="panel">
            {!recommendations.length ? (
              <EmptyState
                icon="target"
                title="No recommendations yet"
                text="The engine works from syllabus topics. Load a syllabus for a subject, or set mastery on a few topics, and suggestions will appear here."
                actionLabel="Open Syllabus"
                onAction={() => ui.navigate('syllabus')}
              />
            ) : (
              recommendations.map((rec, index) => {
                const topic = derived.topicById.get(rec.topicId);
                const subject = derived.bySubjectId.get(rec.subjectId)?.subject;
                if (!topic || !subject) return null;
                return (
                  <article
                    key={rec.topicId}
                    className="focus-item enter--fast"
                    style={{ ['--i' as string]: index }}
                  >
                    <div className="focus-item__rank num">{String(index + 1).padStart(2, '0')}</div>
                    <div className="focus-item__body">
                      <div className="focus-item__title">
                        <h3 className="focus-item__topic">{topic.topic.name}</h3>
                        <span className="focus-item__subject">
                          {subject.name}
                          {topic.topic.code && <span className="mono"> · {topic.topic.code}</span>}
                        </span>
                        <span className="spacer" />
                        <span className="badge">{formatMinutes(rec.minutes)}</span>
                      </div>

                      <div className="row" style={{ gap: 12 }}>
                        <span className={`num ${toneClass(topic.mastery.value)}`} style={{ fontWeight: 560, minWidth: 40, fontSize: '0.844rem' }}>
                          {topic.mastery.value}%
                        </span>
                        <span style={{ flex: 1, maxWidth: 220 }}>
                          <Meter
                            value={topic.mastery.value}
                            tone={scoreTone(topic.mastery.value)}
                            label={`${topic.topic.name} mastery`}
                          />
                        </span>
                      </div>

                      <div>
                        <p className="eyebrow" style={{ marginBottom: 5 }}>
                          Why
                        </p>
                        <ul className="reasons">
                          {rec.reasons.slice(0, 4).map((reason, i) => (
                            <li key={i} className="reason">
                              <span className="reason__mark" aria-hidden="true" />
                              <span>{reason.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {topic.topic.weakness && (
                        <div className="quote">
                          <span className="quote__label">Your note</span>
                          {topic.topic.weakness}
                        </div>
                      )}

                      <div className="row row--wrap" style={{ gap: 6 }}>
                        <Button
                          size="sm"
                          variant="primary"
                          icon="play"
                          onClick={() => ui.openRunner(null, rec.subjectId, rec.topicId)}
                        >
                          Start
                        </Button>
                        <Button size="sm" icon="plus" onClick={() => addToPlan(index)}>
                          Add to today
                        </Button>
                        <Button size="sm" icon="edit" onClick={() => ui.openTopic(rec.topicId)}>
                          Edit topic
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {attention.length > 0 && (
          <section className="section enter" style={{ ['--i' as string]: 2 }}>
            <div className="section__head">
              <h2>Subjects needing attention</h2>
            </div>
            <div className="panel">
              {attention.map((view, i) => (
                <button
                  key={view.subject.id}
                  type="button"
                  className="list-row enter--fast"
                  style={{ ['--i' as string]: i }}
                  onClick={() => ui.openSubjectDetail(view.subject.id)}
                >
                  <span className="list-row__main">
                    <span className="cell-name">{view.subject.name}</span>
                    <span className="cell-sub">{view.priority.headline}</span>
                  </span>
                  <span className="list-row__side">
                    <PriorityMark level={view.priority.level} />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
