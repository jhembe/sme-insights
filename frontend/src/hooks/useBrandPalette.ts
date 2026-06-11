import { useMemo } from 'react';
import { useBusinessStore } from '../store/business.store';

export function useBrandPalette() {
  const accentColor = useBusinessStore((s) => s.accentColor);
  return useMemo(() => {
    const root = document.documentElement;
    const get = (v: string) => getComputedStyle(root).getPropertyValue(v).trim() || '#16a34a';
    return {
      b600: get('--brand-600'),
      b500: get('--brand-500'),
      b400: get('--brand-400'),
      b300: get('--brand-300'),
      b200: get('--brand-200'),
      b100: get('--brand-100'),
      b50:  get('--brand-50'),
    };
  }, [accentColor]);
}
