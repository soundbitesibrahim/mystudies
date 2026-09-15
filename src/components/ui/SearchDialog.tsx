/** Global search across subjects, chapters, topics, assessments, goals and exams. */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../../state/store';
import { useUi } from '../../state/ui';
import { search, searchKindLabel, type SearchHit } from '../../lib/search';
import { goalKindLabel, goalTargetLabel } from '../../lib/goals';

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useStore();
  const ui = useUi();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const subjectName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? 'Unknown';

  const hits = useMemo(
    () =>
      search(
        {
          subjects: data.subjects,
          chapters: data.chapters,
          topics: data.topics,
          assessments: data.assessments,
          goals: data.goals,
          exams: data.exams,
          subjectName,
          goalLabel: (goal) =>
            `${goal.scope === 'overall' ? 'Overall' : subjectName(goal.subjectId ?? '')} · ${goalKindLabel(
              goal.kind,
            )} ${goalTargetLabel(goal, data.settings.gradeThresholds)}`,
        },
        query,
      ),
    [data, query],
  );

  useEffect(() => setActive(0), [query]);

  const go = (hit: SearchHit) => {
    onClose();
    switch (hit.kind) {
      case 'subject':
        ui.openSubjectDetail(hit.id);
        break;
      case 'chapter': {
        const chapter = data.chapters.find((c) => c.id === hit.id);
        ui.setSyllabusFilter({ subjectId: chapter?.subjectId ?? null, view: 'all' });
        ui.navigate('syllabus');
        break;
      }
      case 'topic':
        ui.openTopic(hit.id);
        break;
      case 'assessment':
        ui.navigate('assessments');
        break;
      case 'goal':
        ui.navigate('goals');
        break;
      case 'exam':
        ui.navigate('exams');
        break;
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(hits.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && hits[active]) {
      event.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <Modal open={open} title="Search" subtitle="Subjects, chapters, topics, assessments, goals and exams." onClose={onClose}>
      <div onKeyDown={onKeyDown}>
        <label className="sr-only" htmlFor="global-search">
          Search everything
        </label>
        <input
          id="global-search"
          ref={inputRef}
          className="input"
          type="search"
          placeholder="Try “isotopes”, “mole”, “mock”…"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />

        <div style={{ marginTop: 12, maxHeight: '46vh', overflowY: 'auto' }} role="listbox" aria-label="Search results">
          {query.trim().length < 2 ? (
            <p className="faint" style={{ fontSize: '0.813rem', padding: '10px 4px' }}>
              Type at least two characters.
            </p>
          ) : !hits.length ? (
            <p className="faint" style={{ fontSize: '0.813rem', padding: '10px 4px' }}>
              Nothing matches “{query.trim()}”.
            </p>
          ) : (
            hits.map((hit, i) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                data-active={i === active}
                className="search-result"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(hit)}
              >
                <span style={{ minWidth: 0 }}>
                  <span className="cell-name truncate" style={{ display: 'block' }}>
                    {hit.title}
                  </span>
                  <span className="cell-sub truncate" style={{ display: 'block' }}>
                    {hit.subtitle}
                  </span>
                </span>
                <span className="search-result__kind">{searchKindLabel(hit.kind)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
