/**
 * useStoryLifecycle Hook
 * 
 * Encapsulates common story component logic:
 * - Language management
 * - Page loading
 * - Checkpoint save/load
 * - Book completion handling
 * 
 * This replaces duplicated code across sun-moon, necklace-comb, bernardo-carpio
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Lang, Page, Quiz } from '@/types/story';
import { useLang as useSharedLang, LANG_KEY } from '@/lib/i18n';
import { loadStoryPages } from '@/lib/utils/story';
import { getCheckpoint, saveCheckpoint, resetCheckpoint, toPercentDone } from '@/lib/stories/checkpointClient';
import { markBookComplete } from '@/lib/clients/completeClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface UseStoryLifecycleOptions {
  storySlug: string;
  bookId?: number;
  onComplete?: () => void;
}

export interface UseStoryLifecycleReturn {
  // Language
  lang: Lang;
  setLang: (lang: Lang) => void;
  
  // Pages
  pages: Page[];
  pagesLoading: boolean;
  currentPageIndex: number;
  
  // Navigation
  spreadStart: number;
  rightUnlocked: boolean;
  goNext: () => void;
  goPrev: () => void;
  
  // Quiz state
  quizPageIndex: number | null;
  pendingSide: null | 'left' | 'right';
  selectedAnswer: string;
  hasAnswered: boolean;
  isCorrect: boolean;
  feedback: string;
  handleAnswerSubmit: () => void;
  resetQuiz: () => void;
  tryAgain: () => void;
  continueAfterCorrect: () => void;
  
  // Story state
  isStoryComplete: boolean;
  restartStory: () => void;
  
  // Checkpoint
  saveCheckpoint: (forceComplete?: boolean) => Promise<void>;
  
  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  
  // Boot state
  isBooting: boolean;
}

export function useStoryLifecycle(
  options: UseStoryLifecycleOptions
): UseStoryLifecycleReturn {
  const { storySlug, bookId, onComplete } = options;
  const { toast } = useToast();
  
  // Language
  const { lang, setLang } = useSharedLang();
  
  // Pages
  const [pages, setPages] = useState<Page[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  
  // Navigation state
  const [spreadStart, setSpreadStart] = useState(0);
  const [rightUnlocked, setRightUnlocked] = useState(false);
  
  // Quiz state
  const [quizPageIndex, setQuizPageIndex] = useState<number | null>(null);
  const [pendingSide, setPendingSide] = useState<null | 'left' | 'right'>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Story state
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const completionHandledRef = useRef(false);
  
  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Boot state
  const [isBooting, setIsBooting] = useState(true);
  
  // Load pages when language changes
  useEffect(() => {
    let cancelled = false;
    setPagesLoading(true);
    loadStoryPages(storySlug, lang)
      .then((p) => {
        if (!cancelled) {
          setPages(p);
          setPagesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setPagesLoading(false);
      });
    return () => { cancelled = true; };
  }, [lang, storySlug]);
  
  // Boot lifecycle - hide loader when pages ready
  useEffect(() => {
    if (!isBooting) return;
    const failTimer = setTimeout(() => setIsBooting(false), 5000);
    return () => clearTimeout(failTimer);
  }, [isBooting]);
  
  useEffect(() => {
    if (isBooting && !pagesLoading) {
      const t = setTimeout(() => setIsBooting(false), 250);
      return () => clearTimeout(t);
    }
  }, [pagesLoading, isBooting]);
  
  // Fullscreen handling
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      document.body.classList.toggle('book-fullscreen-mode', !!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.body.classList.remove('book-fullscreen-mode');
    };
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);
  
  // Current page calculations
  const leftIndex = spreadStart;
  const rightIndex = spreadStart + 1;
  const currentPageIndex = rightUnlocked && rightIndex < pages.length ? rightIndex : leftIndex;
  
  // Navigation
  const goNext = useCallback(() => {
    const goingSide: 'left' | 'right' = rightUnlocked ? 'right' : 'left';
    const targetIndex = goingSide === 'left' ? leftIndex : rightIndex;
    const targetPage = pages[targetIndex];
    
    if (targetPage?.quiz) {
      setPendingSide(goingSide);
      setQuizPageIndex(targetIndex);
      return;
    }
    
    if (goingSide === 'left') {
      setRightUnlocked(true);
    } else {
      const nextLeft = spreadStart + 2;
      if (nextLeft >= pages.length) {
        setIsStoryComplete(true);
        if (!completionHandledRef.current) {
          completionHandledRef.current = true;
          (async () => {
            try {
              const resp = await markBookComplete(bookId ?? storySlug);
              if (resp?.awardedBadge?.badgeName) {
                toast({ title: 'Badge Earned!', description: resp.awardedBadge.badgeName });
              }
            } catch {}
            queryClient.invalidateQueries({ queryKey: ['earned-badges'] });
            onComplete?.();
          })();
        }
      } else {
        setSpreadStart(nextLeft);
        setRightUnlocked(false);
      }
    }
  }, [rightUnlocked, leftIndex, rightIndex, pages, spreadStart, bookId, storySlug, toast, onComplete]);
  
  const goPrev = useCallback(() => {
    if (spreadStart > 0) {
      setSpreadStart((prev) => Math.max(0, prev - 2));
      setRightUnlocked(true);
    }
  }, [spreadStart]);
  
  // Quiz handling
  const handleAnswerSubmit = useCallback(() => {
    if (quizPageIndex == null) return;
    const quiz = pages[quizPageIndex]?.quiz;
    if (!quiz) return;
    
    const correct = quiz.options.find((o) => o.slug === selectedAnswer)?.correct;
    setIsCorrect(!!correct);
    setHasAnswered(true);
    setFeedback(!!correct ? (lang === 'en' ? 'Correct! You may continue.' : 'Tama! Maaari ka nang magpatuloy.') : (lang === 'en' ? 'Oops, try again.' : 'Ay naku, subukan muli.'));
    
    if (correct) {
      setAnswers((prev) => ({ ...prev, [quiz.questionSlug]: selectedAnswer }));
    }
  }, [quizPageIndex, pages, selectedAnswer, lang]);
  
  const resetQuiz = useCallback(() => {
    setSelectedAnswer('');
    setHasAnswered(false);
    setIsCorrect(false);
    setFeedback('');
  }, []);
  
  const tryAgain = useCallback(() => resetQuiz(), [resetQuiz]);
  
  const continueAfterCorrect = useCallback(() => {
    if (!isCorrect || pendingSide == null) return;
    
    if (pendingSide === 'left') {
      setRightUnlocked(true);
      setPendingSide(null);
      setQuizPageIndex(null);
      resetQuiz();
    } else {
      setPendingSide(null);
      setQuizPageIndex(null);
      resetQuiz();
      const nextLeft = spreadStart + 2;
      if (nextLeft >= pages.length) {
        setIsStoryComplete(true);
        if (!completionHandledRef.current) {
          completionHandledRef.current = true;
          (async () => {
            try {
              const resp = await markBookComplete(bookId ?? storySlug);
              if (resp?.awardedBadge?.badgeName) {
                toast({ title: 'Badge Earned!', description: resp.awardedBadge.badgeName });
              }
            } catch {}
            queryClient.invalidateQueries({ queryKey: ['earned-badges'] });
            onComplete?.();
          })();
        }
      } else {
        setSpreadStart(nextLeft);
        setRightUnlocked(false);
      }
    }
  }, [isCorrect, pendingSide, spreadStart, pages, bookId, storySlug, toast, resetQuiz, onComplete]);
  
  // Restart story
  const restartStory = useCallback(() => {
    setSpreadStart(0);
    setRightUnlocked(false);
    setPendingSide(null);
    setQuizPageIndex(null);
    setIsStoryComplete(false);
    setAnswers({});
    resetQuiz();
    resetCheckpoint(storySlug).catch(() => {});
  }, [storySlug, resetQuiz]);
  
  // Checkpoint save - use a different name to avoid shadowing the import
  const saveCheckpointState = useCallback(async (forceComplete = false) => {
    try {
      const left = spreadStart;
      const right = spreadStart + 1;
      const currentPageNumber = rightUnlocked && pages[right] ? right + 1 : left + 1;
      const percent = forceComplete ? 100 : Math.floor((currentPageNumber / pages.length) * 100);
      
      await saveCheckpoint(storySlug, {
        pageNumber: currentPageNumber,
        answersJson: answers,
        quizStateJson: {
          pendingSide,
          quizPageIndex,
          selectedAnswer,
          hasAnswered,
          rightUnlocked,
        },
        percentComplete: percent,
      });
    } catch (e) {
      console.warn('[checkpoint] save failed:', e);
    }
  }, [spreadStart, rightUnlocked, pages, storySlug, answers, pendingSide, quizPageIndex, selectedAnswer]);
  
  // Load checkpoint on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCheckpoint(storySlug);
        const cp = data?.checkpoint;
        if (!cp || cancelled) return;
        
        const pageNumber = Math.max(1, Math.min(pages.length, cp.pageNumber ?? 1));
        const spread = Math.floor((pageNumber - 1) / 2) * 2;
        const unlockRight = pageNumber % 2 === 0;
        
        setSpreadStart(spread);
        setRightUnlocked(unlockRight);
        
        if (cp.answersJson && typeof cp.answersJson === 'object') {
          setAnswers(cp.answersJson as Record<string, string>);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [pages.length, storySlug]);
  
  // Auto-save checkpoint
  useEffect(() => {
    if (!pagesLoading && pages.length > 0) {
      saveCheckpointState().catch(() => {});
    }
  }, [pagesLoading, pages, spreadStart, rightUnlocked, answers]);
  
  return {
    lang,
    setLang,
    pages,
    pagesLoading,
    currentPageIndex,
    spreadStart,
    rightUnlocked,
    goNext,
    goPrev,
    quizPageIndex,
    pendingSide,
    selectedAnswer,
    hasAnswered,
    isCorrect,
    feedback,
    handleAnswerSubmit,
    resetQuiz,
    tryAgain,
    continueAfterCorrect,
    isStoryComplete,
    restartStory,
    saveCheckpoint: saveCheckpointState,
    isFullscreen,
    toggleFullscreen,
    isBooting,
  };
}