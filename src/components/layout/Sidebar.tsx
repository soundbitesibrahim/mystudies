/** Primary navigation with an animated active indicator. */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  { id: 'assessments', label: 'Assessments', icon: 'clipboard' },
  { id: 'study', label: 'Study Time', icon: 'clock' },
  { id: 'goals', label: 'Goals', icon: 'flag' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function Sidebar() {
  const { page, navigate } = useUi();
  const { counts } = useDerived();
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ y: 0, h: 0, ready: false });

  const measure = () => {
    const container = navRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    setIndicator({ y: active.offsetTop, h: active.offsetHeight, ready: true });
  };

  useLayoutEffect(measure, [page]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <aside className="sidebar">
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

      <nav className="nav" ref={navRef} aria-label="Main">
        <span
          className="nav__indicator"
          style={{
            transform: `translateY(${indicator.y}px)`,
            height: indicator.h,
            opacity: indicator.ready ? 1 : 0,
          }}
          aria-hidden="true"
        />
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav__item"
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => navigate(item.id)}
          >
            <Icon name={item.icon} className="nav__icon" />
            {item.label}
            {item.id === 'focus' && counts.high > 0 && (
              <span className="nav__count num" aria-label={`${counts.high} high priority`}>
                {counts.high}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar__foot">
        <span className={`dot${canPersist ? '' : ' dot--bad'}`} aria-hidden="true" />
        {canPersist ? 'Saved on this device' : 'Storage unavailable'}
      </div>
    </aside>
  );
}
