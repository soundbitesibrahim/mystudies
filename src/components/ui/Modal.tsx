/**
 * Accessible modal with an exit animation.
 *
 * Keeps itself mounted for the length of the close animation, traps Tab,
 * restores focus, closes on Escape, and locks background scroll.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from './Button';

const CLOSE_MS = 160;

/**
 * Ids of every modal currently on screen, deepest last. Escape is handled at
 * the document level so it works no matter where focus happens to be, and
 * only the topmost dialog reacts to it.
 */
const modalStack: string[] = [];

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: 'md' | 'sm' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, title, subtitle, size = 'md', onClose, children, footer }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2, 8)}`);
  const stackId = useRef(`stack-${Math.random().toString(36).slice(2, 8)}`);
  // Kept in a ref so the Escape effect never re-registers (and never reorders
  // the stack) just because the parent passed a fresh inline callback.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
      returnFocus.current?.focus?.();
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  // Focus the first meaningful control once open.
  useEffect(() => {
    if (!mounted || closing) return;
    const id = window.requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [mounted, closing]);

  // Lock background scroll while a modal is on screen.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Escape closes the topmost dialog, wherever focus currently sits.
  useEffect(() => {
    if (!open) return;
    const id = stackId.current;
    modalStack.push(id);

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (modalStack[modalStack.length - 1] !== id) return;
      event.stopPropagation();
      onCloseRef.current();
    };

    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('keydown', onEscape);
      const index = modalStack.lastIndexOf(id);
      if (index !== -1) modalStack.splice(index, 1);
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  if (!mounted) return null;

  return (
    <div
      className={`modal-backdrop${closing ? ' modal-backdrop--closing' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`modal${size === 'sm' ? ' modal--sm' : size === 'lg' ? ' modal--lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id={titleId.current}>
              {title}
            </h2>
            {subtitle && <p className="modal__sub">{subtitle}</p>}
          </div>
          <IconButton icon="close" label="Close dialog" className="modal__close" onClick={onClose} />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
