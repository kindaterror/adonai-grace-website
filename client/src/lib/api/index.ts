/**
 * API Client Index
 * 
 * Centralized API client for all backend communication.
 * 
 * Usage:
 *   import { apiGet, apiPost } from '@/lib/api/client';
 *   import { login } from '@/lib/api/auth';
 *   import { listBooks } from '@/lib/api/books';
 */

// Re-export client utilities
export { apiGet, apiPost, apiPut, apiDelete, apiUpload, getToken } from './client';

// Re-export API modules
export * from './auth';
export * from './users';
export * from './books';
export * from './students';
export * from './teachers';
export * from './badges';
export * from './reading';
