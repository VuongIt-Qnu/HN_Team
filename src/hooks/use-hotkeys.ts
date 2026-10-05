'use client';

import { useEffect, useRef } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

/** Chuan hoa ten phim: Escape -> ESC, f3 -> F3, Enter -> ENTER */
function normalizeKey(event: KeyboardEvent): string {
  if (event.key === 'Escape') return 'ESC';
  if (event.key === 'Enter') return 'ENTER';
  return event.key.toUpperCase();
}

/**
 * Lang nghe phim tat cho man hinh POS (Buoc 5 cua workflow).
 * Vi du: { F2: () => addTab(), F3: () => focusSearch(), F12: () => checkout() }
 */
export function useHotkeys(handlers: Record<string, HotkeyHandler>, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;

    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      const key = normalizeKey(event);
      const handler = handlersRef.current[key];
      if (!handler) return;

      // Cac phim F2/F3/F4/F12 luon hoat dong ke ca khi dang o trong o nhap lieu
      const isFunctionKey = key.startsWith('F') && key.length <= 3;
      if (isTyping && !isFunctionKey && key !== 'ESC') return;

      event.preventDefault();
      handler(event);
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [enabled]);
}
