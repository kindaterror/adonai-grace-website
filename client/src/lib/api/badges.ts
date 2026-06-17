/**
 * Badges API
 * 
 * Handles badge management and awarding
 */

import { apiGet, apiPost, apiDelete } from './client';

// Types
export interface Badge {
  id: number;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  iconPublicId?: string | null;
  isActive: boolean;
  isGeneric: boolean;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookBadge {
  id: number;
  bookId: number;
  badgeId: number;
  awardMethod: 'auto_on_book_complete' | 'manual';
  completionThreshold: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  badge?: Badge;
}

export interface EarnedBadge {
  id: number;
  userId: number;
  badgeId: number;
  bookId?: number | null;
  awardedById?: number | null;
  note?: string | null;
  awardedAt: string;
  createdAt: string;
  badge?: Badge;
}

/**
 * List all badges
 */
export async function listBadges(): Promise<{ badges: Badge[] }> {
  return apiGet<{ badges: Badge[] }>('/api/badges');
}

/**
 * Create new badge
 */
export async function createBadge(input: {
  name: string;
  description?: string;
  iconUrl?: string | null;
  iconPublicId?: string | null;
  isGeneric?: boolean;
  isActive?: boolean;
}): Promise<Badge> {
  return apiPost<Badge>('/api/badges', input);
}

/**
 * Get badges for a book
 */
export async function getBookBadges(bookId: number): Promise<{ bookBadges: BookBadge[] }> {
  return apiGet<{ bookBadges: BookBadge[] }>(`/api/books/${bookId}/badges`);
}

/**
 * Attach badge to book
 */
export async function attachBadgeToBook(
  bookId: number,
  input: {
    badgeId: number;
    awardMethod?: 'auto_on_book_complete' | 'manual';
    completionThreshold?: number;
  }
): Promise<BookBadge> {
  return apiPost<BookBadge>(`/api/books/${bookId}/badges`, input);
}

/**
 * Remove badge from book
 */
export async function detachBadgeFromBook(bookId: number, badgeId: number): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/books/${bookId}/badges/${badgeId}`);
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(
  userId: number
): Promise<{ success: boolean; earnedBadges: EarnedBadge[] }> {
  return apiGet<{
    success: boolean;
    earnedBadges: EarnedBadge[];
  }>(`/api/users/${userId}/badges`);
}
/**
 * @deprecated Use getUserBadges instead
 */
export const listUserBadges = getUserBadges;

/**
 * Award badge to user
 */
export async function awardBadgeToUser(
  userId: number,
  input: {
    badgeId: number;
    bookId?: number | null;
    note?: string | null;
  }
): Promise<EarnedBadge> {
  return apiPost<EarnedBadge>(`/api/users/${userId}/badges`, input);
}
