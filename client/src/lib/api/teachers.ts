/**
 * Teachers API
 * 
 * Handles teacher management (admin view)
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';

// Types
export interface Teacher {
  id: number;
  email: string;
  name: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  avatarUrl?: string | null;
  emailVerified: boolean;
  preferredGrades?: number[];
  createdAt: string;
}

/**
 * List teachers (with optional filters)
 */
export async function listTeachers(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
}): Promise<{ teachers: Teacher[] }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  
  const query = params.toString();
  return apiGet<{ teachers: Teacher[] }>(query ? `/api/teachers?${query}` : '/api/teachers');
}

/**
 * Approve teacher
 */
export async function approveTeacher(teacherId: number): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>(`/api/teachers/${teacherId}/approve`, {});
}

/**
 * Reject teacher
 */
export async function rejectTeacher(teacherId: number, reason?: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>(`/api/teachers/${teacherId}/reject`, { reason });
}

/**
 * Create teacher (admin)
 */
export async function createTeacher(input: {
  email: string;
  name: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}): Promise<Teacher> {
  return apiPost<Teacher>('/api/teachers', input);
}
