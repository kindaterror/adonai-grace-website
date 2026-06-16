/**
 * Story utilities - shared helper functions for story components
 */

import type { Page, Lang } from '@/types/story';
import { withBase } from '@/lib/i18n';

/**
 * Load story pages for a given language
 * Handles dynamic JSON import and path normalization
 */
export async function loadStoryPages(
  storySlug: string,
  lang: Lang
): Promise<Page[]> {
  const mod = await import(`@/content/stories/${storySlug}.${lang}.json`);
  const arr = (mod.default || []) as Page[];
  
  // Normalize video paths to absolute URLs
  return arr.map((p) => ({
    ...p,
    videoMp4: p.videoMp4 ? withBase(p.videoMp4) : undefined,
    videoWebm: p.videoWebm ? withBase(p.videoWebm) : undefined,
    videoPoster: p.videoPoster ? withBase(p.videoPoster) : undefined,
  }));
}

/**
 * Calculate percentage of story completion
 */
export function toPercentDone(currentIdx: number, total: number): number {
  if (!total || total <= 0) return 0;
  const pct = Math.round(((currentIdx + 1) / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Safe localStorage access with fallback
 */
export function getStorageItem(key: string, fallback: string = ''): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}