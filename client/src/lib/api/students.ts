/**
 * Students API
 * 
 * Handles student management (admin/teacher views)
 */

import { apiGet, apiPost, apiPut } from './client';

// Types
export interface Student {
  id: number;
  email: string;
  name: string;
  grade: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  avatarUrl?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface StudentProgress {
  studentId: number;
  studentName: string;
  bookId: number;
  bookTitle: string;
  progress: number;
  completed: boolean;
  lastReadAt?: string;
}

/**
 * List students (with optional filters)
 */
export async function listStudents(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  grade?: number;
  search?: string;
}): Promise<{ students: Student[] }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.grade) params.set('grade', String(filters.grade));
  if (filters?.search) params.set('search', filters.search);
  
  const query = params.toString();
  return apiGet<{ students: Student[] }>(query ? `/api/students?${query}` : '/api/students');
}

/**
 * Approve student
 */
export async function approveStudent(studentId: number): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>(`/api/students/${studentId}/approve`, {});
}

/**
 * Reject student
 */
export async function rejectStudent(studentId: number, reason?: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>(`/api/students/${studentId}/reject`, { reason });
}

/**
 * Get student progress (admin view)
 */
export async function getStudentProgress(studentId?: number): Promise<{ progress: StudentProgress[] }> {
  const query = studentId ? `?studentId=${studentId}` : '';
  return apiGet<{ progress: StudentProgress[] }>(`/api/progress${query}`);
}

/**
 * Get all student progress (for admin/teacher)
 */
export async function getAllProgress(): Promise<{ progress: StudentProgress[] }> {
  return apiGet<{ progress: StudentProgress[] }>('/api/progress');
}
