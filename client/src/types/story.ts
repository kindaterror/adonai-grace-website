/**
 * Story Types
 * 
 * Shared types used by all story components
 */

export type Lang = "en" | "fil";

export type QAOption = {
  slug: string;
  text: string;
  correct: boolean;
};

export type Quiz = {
  questionSlug: string;
  question: string;
  options: QAOption[];
};

export type Page = {
  id: string;
  title?: string;
  narration: string;
  character?: string;
  illustration?: string;
  quiz?: Quiz;
  videoMp4?: string;
  videoWebm?: string;
  videoPoster?: string;
  videoInitialStart?: number;
  videoInitialEnd?: number;
  videoLoopStart?: number;
  videoLoopEnd?: number;
  videoPlaybackRate?: number;
};

export type StoryBook = {
  slug: string;
  title: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  pages: Page[];
  totalPages: number;
};

export type StoryProgress = {
  currentPage: number;
  unlockedPages: number[];
  completed: boolean;
  lastReadAt: string;
};

export type BookCompleteResponse = {
  success: boolean;
  awardedBadge?: {
    badgeId: number;
    badgeName: string;
    iconUrl?: string;
  };
};

// i18n translations type
export type StoryTranslations = {
  title: string;
  subtitle: string;
  backToStories: string;
  pageOf: (current: string, total: string) => string;
  pageRangeOf: (start: string, end: string, total: string) => string;
  unlockHint: string;
  question: string;
  submit: string;
  tryAgain: string;
  continue: string;
  correct: string;
  wrong: string;
  readAgain: string;
  backToShelf: string;
  finaleThanksTitle: string;
  finaleThanksDesc: string;
  reflectionHeader: string;
  reflectionQ1: string;
  reflectionQ2: string;
  langToggle: (lang: Lang) => string;
  langToggleAria: string;
  loading: string;
};

export type AllTranslations = {
  en: StoryTranslations;
  fil: StoryTranslations;
};