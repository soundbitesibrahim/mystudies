/** Spaced review: what is due now, what is coming, what you have just done. */

import React from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { StatusDot, scoreTone, toneClass } from '../components/ui/Indicators';
import { intervals } from '../lib/revision';
import { formatDate, pluralize, relativeDays } from '../lib/utils';
import type { TopicView } from '../state/derived';

export function RevisionPage() {
  const { data } = useStore();
  const derived = useDerived();
  const ui = useUi();
  const { revision } = derived;

  if (!data.topics.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="repeat"
            title="Nothing to revise yet"
            text="Revision is scheduled per topic. Load or add a syllabus, then study a topic — the next review is scheduled automatically."
            actionLabel="Open Syllabus"
            onAction={() => ui.navigate('syllabus')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page page-transition">
      <div className="stack">
        <section className="section enter">
          <div className="section__head">
            <div>
              <h2>Due now</h2>
              <p className="section__hint">
                Topics past their review date, oldest first. Reviews use a{' '}
                {intervals(data.settings).join(', ')} day ladder — a good session moves a topic up it,
                a shaky one moves it back.
              </p>
            </div>
          </div>
          <div className="panel">
            {!revision.overdue.length ? (
              <EmptyState
                icon="check"
                title="Nothing is overdue"
                text="Every topic you have studied is on schedule. Check back after your next session."
              />
            ) : (
              revision.overdue.map((topic, i) => <RevisionRow key={topic.topic.id} topic={topic} index={i} />)
            )}
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <h2>Due soon</h2>
          </div>
          <div className="panel">
            {!revision.dueSoon.length ? (
              <p className="muted" style={{ padding: '18px 20px', fontSize: '0.844rem' }}>
                Nothing scheduled yet. Studying a topic schedules its first review.
              </p>
            ) : (
              revision.dueSoon.map((topic, i) => <RevisionRow key={topic.topic.id} topic={topic} index={i} />)
            )}
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 2 }}>
          <div className="section__head">
            <h2>Recently revised</h2>
          </div>
          <div className="panel">
            {!revision.recent.length ? (
              <p className="muted" style={{ padding: '18px 20px', fontSize: '0.844rem' }}>
                No topics revised yet.
              </p>
            ) : (
              revision.recent.map((topic, i) => (
                <div key={topic.topic.id} className="list-row enter--fast" style={{ ['--i' as string]: i }}>
                  <span className="list-row__main">
                    <span className="cell-name">{topic.topic.name}</span>
                    <span className="cell-sub">
                      {topic.subjectName} · revised {relativeDays(topic.topic.lastRevised)}
                    </span>
                  </span>
                  <span className="list-row__side">
                    <span className={`num ${toneClass(topic.mastery.value)}`} style={{ fontWeight: 560 }}>
                      {topic.mastery.value}%
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RevisionRow({ topic, index }: { topic: TopicView; index: number }) {
  const ui = useUi();
  const actions = useActions();

  return (
    <div className="list-row enter--fast" style={{ ['--i' as string]: index }}>
      <span className="list-row__main">
        <span className="row" style={{ gap: 8 }}>
          <StatusDot tone={topic.revision.status === 'overdue' ? 'risk' : 'attention'} />
          <span className="cell-name">{topic.topic.name}</span>
        </span>
        <span className="cell-sub">
          {topic.subjectName} · {topic.chapterName} · last studied {relativeDays(topic.topic.lastStudied)}
          {topic.topic.nextRevision ? ` · due ${formatDate(topic.topic.nextRevision)}` : ''}
        </span>
      </span>
      <span className="list-row__side">
        <span className="badge">{topic.revision.label}</span>
        <span className={`num ${toneClass(topic.mastery.value)}`} style={{ fontWeight: 560, minWidth: 38, textAlign: 'right' }}>
          {topic.mastery.value}%
        </span>
        <Button
          size="sm"
          icon="play"
          onClick={() => ui.openRunner(null, topic.topic.subjectId, topic.topic.id)}
        >
          <span className="btn-label">Revise</span>
        </Button>
      </span>
    </div>
  );
}
