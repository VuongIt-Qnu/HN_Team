'use client';

import { useEffect, useState } from 'react';

/**
 * Theo doi media query cua trinh duyet (an toan voi SSR/Next.js).
 * Lan render dau tien luon tra ve `false` de HTML cua Server va Client khop nhau,
 * sau khi mount moi cap nhat theo kich thuoc that cua man hinh.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
