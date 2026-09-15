/** Animated toast notifications — used instead of browser alerts. */

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  closing: boolean;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const LIFETIME = 3200;
const EXIT_MS = 190;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    window.setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, message, kind, closing: false }]);
      window.setTimeout(() => dismiss(id), LIFETIME);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}${t.closing ? ' toast--closing' : ''}`}>
            <span className="toast__mark" aria-hidden="true">
              {t.kind === 'error' ? '!' : t.kind === 'info' ? 'i' : '✓'}
            </span>
            <span className="toast__text">{t.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
