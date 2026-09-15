/** The syllabus: chapters, topics, mastery, and the filters that find weak spots. */

import React, { useMemo, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Meter, StatusDot, scoreTone, toneClass } from '../components/ui/Indicators';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { MASTERY_META } from '../lib/mastery';
import { matches, pluralize } from '../lib/utils';
import { seedForCode, seedForName } from '../data/syllabus';
import type { ChapterView, SubjectView } from '../state/derived';

type ViewFilter = 'all' | 'weak' | 'not-started' | 'due';

const FILTERS: Array<{ value: ViewFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'weak', label: 'Weak' },
  { value: 'not-started', label: 'Not started' },
  { value: 'due', label: 'Due for revision' },
];

export function SyllabusPage() {
  const { data } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const ui = useUi();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { subjectId, view: filter } = ui.syllabusFilter;

  const subjects = subjectId
    ? derived.subjectViews.filter((v) => v.subject.id === subjectId)
    : derived.subjectViews;

  const toggle = (id: string) =>
    setExpanded((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!data.subjects.length) {
    return (
      <div className="page page-transition">
        <div className="panel">
          <EmptyState
            icon="layers"
            title="No subjects yet"
            text="Add a subject first. If its name or code matches a syllabus we know, the chapter outline can be loaded for you."
            actionLabel="Add subject"
            onAction={() => ui.openSubject()}
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
              <h2>Syllabus</h2>
              <p className="section__hint">
                Track where you actually are, chapter by chapter. Select a topic to set its mastery,
                confidence and notes.
              </p>
            </div>
            <div className="row row--wrap" style={{ gap: 6 }}>
              <label className="sr-only" htmlFor="syllabus-subject">
                Filter by subject
              </label>
              <select
                id="syllabus-subject"
                className="select"
                style={{ width: 'auto', minWidth: 150 }}
                value={subjectId ?? ''}
                onChange={(e) => ui.setSyllabusFilter({ subjectId: e.target.value || null })}
              >
                <option value="">All subjects</option>
                {data.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="syllabus-search">
                Search topics
              </label>
              <input
                id="syllabus-search"
                className="input"
                type="search"
                style={{ width: 'auto', minWidth: 170 }}
                placeholder="Search topics…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="chip-row">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="chip"
                aria-pressed={filter === f.value}
                onClick={() => ui.setSyllabusFilter({ view: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {subjects.map((subjectView, si) => (
          <SubjectSyllabus
            key={subjectView.subject.id}
            view={subjectView}
            index={si}
            filter={filter}
            query={query}
            expanded={expanded}
            onToggle={toggle}
            onLoadSeed={() => {
              const seed =
                seedForCode(subjectView.subject.code) ?? seedForName(subjectView.subject.name);
              if (!seed) return;
              actions.applySeed(subjectView.subject.id, seed);
              toast.success(`${seed.name} outline loaded`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SubjectSyllabus({
  view,
  index,
  filter,
  query,
  expanded,
  onToggle,
  onLoadSeed,
}: {
  view: SubjectView;
  index: number;
  filter: ViewFilter;
  query: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onLoadSeed: () => void;
}) {
  const { data } = useStore();
  const actions = useActions();
  const ui = useUi();
  const seed = seedForCode(view.subject.code) ?? seedForName(view.subject.name);
  const noticeId = `syllabus-seed:${view.subject.id}`;
  const showNotice =
    view.chapters.some((c) => c.chapter.source === 'seed') &&
    !data.dismissedNotices.includes(noticeId);

  const chapters = useMemo(() => {
    return view.chapters
      .map((chapter) => ({
        ...chapter,
        topics: chapter.topics.filter((t) => {
          if (query.trim() && !matches(t.topic.name, query) && !matches(t.topic.code, query)) {
            return false;
          }
          if (filter === 'weak') return t.mastery.value < 55 && t.topic.state !== 'not-started';
          if (filter === 'not-started') return t.topic.state === 'not-started';
          if (filter === 'due') {
            return t.revision.status === 'overdue' || t.revision.status === 'due-today' || t.revision.status === 'due-soon';
          }
          return true;
        }),
      }))
      .filter((chapter) => chapter.topics.length > 0 || (filter === 'all' && !query.trim()));
  }, [view.chapters, filter, query]);

  const totalShown = chapters.reduce((acc, c) => acc + c.topics.length, 0);

  return (
    <section className="section enter" style={{ ['--i' as string]: index }}>
      <div className="section__head">
        <div>
          <h2>
            {view.subject.name}
            {view.subject.code && <span className="mono faint"> {view.subject.code}</span>}
          </h2>
          <p className="section__hint">
            {view.coverage === null
              ? 'No topics yet'
              : [
                  `${Math.round(view.coverage * 100)}% covered`,
                  view.mastery === null ? 'no topics started' : `${view.mastery}% mean mastery`,
                  `${view.topics.length} ${pluralize(view.topics.length, 'topic')}`,
                ].join(' · ')}
          </p>
        </div>
        <Button size="sm" icon="plus" onClick={() => ui.openSubjectDetail(view.subject.id)}>
          Subject dashboard
        </Button>
      </div>

      {showNotice && (
        <div className="notice">
          <Icon name="info" size={15} style={{ flex: 'none', marginTop: 2 }} />
          <div className="notice__body">
            {seed?.note ?? 'This outline was loaded from a published syllabus.'} It is a starting
            point — check it against your school&apos;s Y9 scheme of work and edit, add or remove
            anything.
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                className="link-btn"
                onClick={() => actions.dismissNotice(noticeId)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        {!view.chapters.length ? (
          <div style={{ padding: '20px' }}>
            <EmptyState
              icon="layers"
              title="No syllabus for this subject"
              text={
                seed
                  ? `Load the published ${seed.name} (${seed.code}) outline as a starting point, or add chapters yourself.`
                  : 'Add chapters and topics to start tracking what you actually know.'
              }
              actionLabel={seed ? `Load ${seed.code} outline` : undefined}
              onAction={seed ? onLoadSeed : undefined}
            />
            <div className="row" style={{ justifyContent: 'center', marginTop: -12 }}>
              <Button
                size="sm"
                icon="plus"
                onClick={() =>
                  actions.addChapter({
                    subjectId: view.subject.id,
                    code: '',
                    name: 'New chapter',
                    order: 0,
                  })
                }
              >
                Add a chapter
              </Button>
            </div>
          </div>
        ) : !totalShown ? (
          <p className="muted" style={{ padding: '18px 20px', fontSize: '0.844rem' }}>
            No topics match this filter.
          </p>
        ) : (
          chapters.map((chapter) => (
            <ChapterBlock
              key={chapter.chapter.id}
              chapter={chapter}
              expanded={expanded.has(chapter.chapter.id) || filter !== 'all' || query.trim().length > 0}
              onToggle={() => onToggle(chapter.chapter.id)}
            />
          ))
        )}
      </div>

      {view.chapters.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          <Button
            size="sm"
            icon="plus"
            onClick={() =>
              actions.addChapter({
                subjectId: view.subject.id,
                code: '',
                name: 'New chapter',
                order: view.chapters.length,
              })
            }
          >
            Add chapter
          </Button>
        </div>
      )}
    </section>
  );
}

function ChapterBlock({
  chapter,
  expanded,
  onToggle,
}: {
  chapter: ChapterView;
  expanded: boolean;
  onToggle: () => void;
}) {
  const actions = useActions();
  const ui = useUi();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [chapterName, setChapterName] = useState(chapter.chapter.name);

  const addTopic = () => {
    if (!name.trim()) return;
    actions.addTopic({
      chapterId: chapter.chapter.id,
      subjectId: chapter.chapter.subjectId,
      name: name.trim(),
    });
    setName('');
    setAdding(false);
  };

  return (
    <div className="chapter">
      <div className="row" style={{ gap: 0 }}>
        <button type="button" className="chapter__head" aria-expanded={expanded} onClick={onToggle}>
          <Icon name="chevron-right" size={14} className="chapter__chevron" />
          {chapter.chapter.code && <span className="mono faint">{chapter.chapter.code}</span>}
          {renaming ? (
            <input
              className="input"
              style={{ maxWidth: 260 }}
              value={chapterName}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setChapterName(e.target.value)}
              onBlur={() => {
                actions.updateChapter(chapter.chapter.id, { name: chapterName.trim() || chapter.chapter.name });
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
          ) : (
            <span className="chapter__name truncate">{chapter.chapter.name}</span>
          )}
          <span className="chapter__progress">
            <span className="chapter__meter">
              <Meter value={chapter.completion} label={`${chapter.chapter.name} progress`} />
            </span>
            <span className="chapter__pct num">{chapter.completion}%</span>
          </span>
        </button>
        <span className="row" style={{ gap: 0, paddingRight: 10 }}>
          <IconButton
            icon="edit"
            label={`Rename ${chapter.chapter.name}`}
            onClick={() => {
              setChapterName(chapter.chapter.name);
              setRenaming(true);
            }}
          />
          <IconButton
            icon="trash"
            label={`Delete ${chapter.chapter.name}`}
            onClick={() =>
              ui.askConfirm({
                title: `Delete ${chapter.chapter.name}?`,
                message: `This removes the chapter and its ${chapter.topics.length} topics.`,
                confirmLabel: 'Delete chapter',
                onConfirm: () => actions.deleteChapter(chapter.chapter.id),
              })
            }
          />
        </span>
      </div>

      {expanded && (
        <div className="topic-list">
          {chapter.topics.map((topic) => {
            const tone = scoreTone(topic.mastery.value);
            return (
              <button
                key={topic.topic.id}
                type="button"
                className="topic-row"
                onClick={() => ui.openTopic(topic.topic.id)}
              >
                <StatusDot
                  tone={topic.topic.state === 'not-started' ? 'none' : tone}
                  label={MASTERY_META[topic.topic.state].label}
                />
                {topic.topic.code && <span className="mono faint">{topic.topic.code}</span>}
                <span className="topic-row__name">{topic.topic.name}</span>
                <span className="topic-row__meta">
                  <span>{MASTERY_META[topic.topic.state].label}</span>
                  <span className={topic.topic.state === 'not-started' ? 'faint' : toneClass(topic.mastery.value)}>
                    {topic.mastery.value}%
                  </span>
                  {(topic.revision.status === 'overdue' || topic.revision.status === 'due-today') && (
                    <span className="badge badge--attention">{topic.revision.label}</span>
                  )}
                </span>
              </button>
            );
          })}

          {adding ? (
            <div className="row" style={{ gap: 6, padding: '8px 18px 10px 44px' }}>
              <label className="sr-only" htmlFor={`new-topic-${chapter.chapter.id}`}>
                New topic name
              </label>
              <input
                id={`new-topic-${chapter.chapter.id}`}
                className="input"
                autoFocus
                placeholder="Topic name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTopic();
                  if (e.key === 'Escape') setAdding(false);
                }}
              />
              <Button size="sm" variant="primary" onClick={addTopic}>
                Add
              </Button>
              <Button size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div style={{ padding: '6px 18px 10px 44px' }}>
              <Button size="sm" variant="ghost" icon="plus" onClick={() => setAdding(true)}>
                Add topic
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
