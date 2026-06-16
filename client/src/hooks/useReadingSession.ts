/**
 * useReadingSession Hook
 * 
 * Manages reading session tracking - starts session on mount,
 * ends on unmount or visibility change.
 */

import { useEffect, useRef } from 'react';
import { startReadingSession, endReadingSession } from '@/lib/api/reading';

export function useReadingSession(bookSlug: string) {
  const activeRef = useRef(true);
  const sessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Start reading session on mount
    const startSession = async () => {
      try {
        const response = await startReadingSession(bookSlug);
        if (response.sessionId && activeRef.current) {
          sessionIdRef.current = response.sessionId;
        }
      } catch (e) {
        console.error('Failed to start reading session:', e);
      }
    };

    startSession();

    // End session function
    const endSession = async () => {
      if (sessionIdRef.current) {
        try {
          await endReadingSession(sessionIdRef.current, bookSlug, 0);
        } catch (e) {
          console.error('Failed to end reading session:', e);
        }
      }
    };

    // End session when page visibility changes (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeRef.current) {
        endSession();
      }
    };

    // End session when user leaves the page
    const handleBeforeUnload = () => {
      if (activeRef.current) {
        // Use sendBeacon for more reliable delivery
        const data = JSON.stringify({ slug: bookSlug });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/reading-sessions/end', data);
        } else {
          endSession();
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      activeRef.current = false;
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [bookSlug]);
}