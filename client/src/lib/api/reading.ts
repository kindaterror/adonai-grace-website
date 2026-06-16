/**
 * Reading Sessions API
 * 
 * Handles reading session tracking
 */

import { apiPost, apiGet } from './client';

// Types
export interface ReadingSession {
  id: number;
  bookId: number;
  userId: number;
  startedAt: string;
  endedAt?: string;
  pagesRead: number;
}

/**
 * Start a reading session
 * @param bookId - The book ID or slug
 */
export async function startReadingSession(bookId: number | string): Promise<{ sessionId: number }> {
  return apiPost<{ sessionId: number }>('/api/reading-sessions/start', { 
    bookId: typeof bookId === 'string' ? undefined : bookId,
    slug: typeof bookId === 'string' ? bookId : undefined 
  });
}

/**
 * End a reading session
 * @param sessionId - The session ID
 * @param bookId - The book ID or slug
 * @param pagesRead - Number of pages read
 */
export async function endReadingSession(
  sessionId: number,
  bookId: number | string,
  pagesRead: number
): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/api/reading-sessions/end', {
    sessionId,
    bookId: typeof bookId === 'string' ? undefined : bookId,
    slug: typeof bookId === 'string' ? bookId : undefined,
    pagesRead,
  });
}

/**
 * Get reading sessions for user
 */
export async function getReadingSessions(): Promise<{ sessions: ReadingSession[] }> {
  return apiGet<{ sessions: ReadingSession[] }>('/api/reading-sessions');
}
