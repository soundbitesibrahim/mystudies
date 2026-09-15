/** Primary navigation. A fixed rail on desktop, a drawer on small screens. */

import React, { useEffect, useRef } from 'react';
import { Icon, type IconName } from '../ui/Icon';
import { useUi, type PageId } from '../../state/ui';
import { useDerived } from '../../state/store';
import { canPersist } from '../../lib/storage';

interface NavEntry {
  id: PageId;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavEntry[] = [
  { id: 'overview', label: 'Overview', icon: 'gauge' },
  { id: 'focus', label: 'My Focus', icon: 'target' },
  { id: 'subjects', label: 'Subjects', icon: 'book' },
  { id: 'syllabus', label: 'Syllabus', icon: 'layers' },
  { id: 'assessments', label: 'Assessments', icon: 'clipboard' },
  { id: 'study', label: 'Study', icon: 'clock' },
  { id: 'revision', label: 'Revision', icon: 'repeat' },
  { id: 'goals', label: 'Goals', icon: 'flag' },
  { id: 'exams', label: 'Exams', icon: 'calendar' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar() {
  const { page, navigate, menuOpen, setMenuOpen } = useUi();
  const { counts } = useDerived();
  const asideRef = useRef<HTMLElement>(null);

  // Escape closes the drawer; focus moves into it when it opens.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    asideRef.current?.querySelector<HTMLElement>('.nav__item')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, setMenuOpen]);

  const badgeFor = (id: PageId): number => {
    if (id === 'focus') return counts.high;
    if (id === 'revision') return counts.overdueRevisions;
    return 0;
  };

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          className="sidebar__scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className="sidebar" data-open={menuOpen} ref={asideRef}>
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            AC
          </span>
          <span>
            <span className="brand__name">Academic</span>
            <br />
            <span className="brand__sub">Command Center</span>
          </span>
        </div>

        <nav className="nav" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const badge = badgeFor(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className="nav__item"
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} className="nav__icon" />
                {item.label}
                {badge > 0 && (
                  <span className="nav__count num" aria-label={`${badge} need attention`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__foot">
          <span className={`dot${canPersist ? '' : ' dot--bad'}`} aria-hidden="true" />
          {canPersist ? 'Saved on this device' : 'Storage unavailable'}
        </div>
      </aside>
    </>
  );
}
