/**
 * Books API
 * 
 * Handles book CRUD, chapters, reading progress
 */

import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './client';

// Types
export interface Book {
  id: number;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  coverPublicId?: string | null;
  grade: number;
  type: 'story' | 'educational';
  isExclusive: boolean;
  addedById?: number | null;
  addedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookChapter {
  id: number;
  bookId: number;
  chapterNumber: number;
  title: string;
  content: string;
  videoUrl?: string | null;
  createdAt: string;
}

export interface CreateBookInput {
  title: string;
  description?: string;
  coverUrl?: string | null;
  coverPublicId?: string | null;
  grade: number;
  type: 'story' | 'educational';
  isExclusive?: boolean;
}

export interface UpdateBookInput extends Partial<CreateBookInput> {
  isActive?: boolean;
}

/**
 * List all books (with optional filters)
 */
export async function listBooks(filters?: {
  grade?: number;
  type?: 'story' | 'educational';
  isExclusive?: boolean;
  search?: string;
}): Promise<{ books: Book[] }> {
  const params = new URLSearchParams();
  if (filters?.grade) params.set('grade', String(filters.grade));
  if (filters?.type) params.set('type', filters.type);
  if (filters?.isExclusive !== undefined) params.set('exclusive', String(filters.isExclusive));
  if (filters?.search) params.set('search', filters.search);
  
  const query = params.toString();
  return apiGet<{ books: Book[] }>(query ? `/api/books?${query}` : '/api/books');
}

/**
 * Get single book by ID
 */
export async function getBook(id: number): Promise<Book> {
  return apiGet<Book>(`/api/books/${id}`);
}

/**
 * Create new book
 */
export async function createBook(input: CreateBookInput): Promise<Book> {
  return apiPost<Book>('/api/books', input);
}

/**
 * Update book
 */
export async function updateBook(id: number, input: UpdateBookInput): Promise<Book> {
  return apiPut<Book>(`/api/books/${id}`, input);
}

/**
 * Delete book
 */
export async function deleteBook(id: number): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/books/${id}`);
}

/**
 * Get book chapters
 */
export async function getChapters(bookId: number): Promise<{ chapters: BookChapter[] }> {
  return apiGet<{ chapters: BookChapter[] }>(`/api/books/${bookId}/chapters`);
}

/**
 * Get exclusive books for current user
 */
export async function getExclusiveBooks(): Promise<{ books: Book[] }> {
  return apiGet<{ books: Book[] }>('/api/books/exclusive');
}

/**
 * Mark book as complete
 */
export async function completeBook(bookId: number): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/books/${bookId}/complete`, {});
}

/**
 * Upload book cover
 */
export async function uploadBookCover(file: File, folder?: string): Promise<{ coverUrl: string; coverPublicId: string }> {
  return apiUpload<{ coverUrl: string; coverPublicId: string }>('/api/upload?folder=' + encodeURIComponent(folder || 'book-covers'), file, folder || 'book-covers');
}

/**
 * Get teacher-added books
 */
export async function getTeacherBooks(): Promise<{ books: Book[] }> {
  return apiGet<{ books: Book[] }>('/api/teacher/books');
}
