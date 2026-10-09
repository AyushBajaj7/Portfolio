import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const subscribe = (listener: () => void) => {
  const media = matchMedia(query);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const snapshot = () => matchMedia(query).matches;

/** Includes preference changes while the page is open. */
export const useMotionPreference = () => useSyncExternalStore(subscribe, snapshot, () => false);
