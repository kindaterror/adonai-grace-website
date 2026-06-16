/**
 * Shared i18n utilities for story components
 * 
 * Provides language detection, persistence, and hook for story pages
 */

import { useState, useEffect } from 'react';
import type { Lang, StoryTranslations } from '@/types/story';

/** Storage key for language preference */
export const LANG_KEY = 'ags.lang';

/**
 * Detect initial language based on browser settings and localStorage
 * Priority: localStorage > browser language > fallback to 'en'
 */
export function detectInitialLang(): Lang {
  try {
    const saved = (localStorage.getItem(LANG_KEY) || '').toLowerCase();
    if (saved === 'en' || saved === 'fil') return saved as Lang;
  } catch {
    // localStorage unavailable
  }
  
  const nav = (navigator.language || '').toLowerCase();
  const langs = (navigator.languages || []).map((l) => l.toLowerCase());
  
  // Check for Filipino
  const anyFil = [nav, ...langs].some((l) => l.startsWith('fil') || l.startsWith('tl'));
  if (anyFil) return 'fil';
  
  // Check for Philippines locale
  if (nav.endsWith('-ph') || langs.some((l) => l.endsWith('-ph'))) return 'fil';
  
  return 'en';
}

/**
 * Custom hook for language management in story components
 * Handles persistence and provides lang/setLang interface
 */
export function useLang() {
  const [lang, setLang] = useState<Lang>(detectInitialLang);
  
  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // localStorage unavailable
    }
  }, [lang]);
  
  return { lang, setLang };
}

/**
 * Type-safe translation function helper
 */
export type TranslationKey = keyof StoryTranslations;

/**
 * All story translations (used by story components)
 * Each story can extend this with story-specific translations
 */
export const i18n: Record<Lang, StoryTranslations> = {
  en: {
    title: '',
    subtitle: '',
    backToStories: 'Back to Stories',
    pageOf: (a: string, b: string) => `Page ${a} of ${b}`,
    pageRangeOf: (a: string, b: string, c: string) => `Page ${a}–${b} of ${c}`,
    unlockHint: 'unlock the next page by answering the question (if any)',
    question: 'Question',
    submit: 'Submit',
    tryAgain: 'Try Again',
    continue: 'Continue',
    correct: 'Correct! You may continue.',
    wrong: 'Oops, try again.',
    readAgain: 'Read Again from Start',
    backToShelf: 'Back to Story Shelf',
    finaleThanksTitle: '',
    finaleThanksDesc: '',
    reflectionHeader: 'Quick reflection:',
    reflectionQ1: '',
    reflectionQ2: '',
    langToggle: (lang: Lang) => (lang === 'en' ? 'FIL' : 'EN'),
    langToggleAria: 'Toggle language',
    loading: 'Loading',
  },
  fil: {
    title: '',
    subtitle: '',
    backToStories: 'Bumalik sa Mga Kuwento',
    pageOf: (a: string, b: string) => `Pahina ${a} ng ${b}`,
    pageRangeOf: (a: string, b: string, c: string) => `Pahina ${a}–${b} ng ${c}`,
    unlockHint: 'i-unlock ang susunod na pahina sa pagsagot sa tanong (kung meron)',
    question: 'Tanong',
    submit: 'Isumite',
    tryAgain: 'Subukang Muli',
    continue: 'Magpatuloy',
    correct: 'Tama! Maaari ka nang magpatuloy.',
    wrong: 'Ay naku, subukan muli.',
    readAgain: 'Basahin Muli mula Simula',
    backToShelf: 'Bumalik sa Estante ng Kuwento',
    finaleThanksTitle: '',
    finaleThanksDesc: '',
    reflectionHeader: 'Mabilis na pagninilay:',
    reflectionQ1: '',
    reflectionQ2: '',
    langToggle: (lang: Lang) => (lang === 'en' ? 'FIL' : 'EN'),
    langToggleAria: 'Palitan ang wika',
    loading: 'Naglo-load',
  },
};

/**
 * Create a translation getter for a specific language
 */
export function getTranslations(lang: Lang): StoryTranslations {
  const translations = i18n[lang];
  if (!translations) {
    console.warn(`Missing translations for lang: ${lang}, falling back to 'en'`);
    return i18n.en;
  }
  return translations;
}

/**
 * Helper to normalize video/image paths to absolute URLs
 */
export function withBase(path: string): string {
  return '/' + path.replace(/^\//, '');
}