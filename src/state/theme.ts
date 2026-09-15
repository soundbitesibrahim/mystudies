/** Applies the theme preference to the document and tracks the system theme. */

import { useEffect } from 'react';
import type { ThemePreference } from '../lib/types';

export function useAppliedTheme(preference: ThemePreference): void {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');

    const apply = () => {
      const resolved =
        preference === 'system' ? (media.matches ? 'light' : 'dark') : preference;
      root.dataset.theme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'light' ? '#f6f7f9' : '#0b0d11');
    };

    apply();
    if (preference !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
}

/** True when the user asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
