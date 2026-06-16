/**
 * User API
 * 
 * Handles user profile, settings, password management
 */

import { apiGet, apiPost, apiPut, getToken } from './client';

// Types
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  grade?: number | null;
  approvalStatus?: string;
  emailVerified: boolean;
  securityQuestion?: string | null;
  createdAt: string;
}

export interface TeachingSettings {
  id: number;
  userId: number;
  preferredGrades: number[];
  updatedAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>('/api/user/profile');
}

/**
 * Update user profile
 */
export async function updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
  return apiPut<UserProfile>('/api/user/profile', input);
}

/**
 * Get teaching settings
 */
export async function getTeachingSettings(): Promise<TeachingSettings> {
  return apiGet<TeachingSettings>('/api/user/teaching-settings');
}

/**
 * Update teaching settings
 */
export async function updateTeachingSettings(preferredGrades: number[]): Promise<TeachingSettings> {
  return apiPut<TeachingSettings>('/api/user/teaching-settings', { preferredGrades });
}

/**
 * Update password
 */
export async function updatePassword(input: UpdatePasswordInput): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/api/user/password', input);
}

/**
 * Upload avatar
 */
export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/user/avatar', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
