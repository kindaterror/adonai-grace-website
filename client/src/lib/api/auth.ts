/**
 * Authentication API
 * 
 * Handles login, registration, password reset, email verification
 */

import { apiGet, apiPost } from './client';

// Types
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  message?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher';
  grade?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface VerifySecurityAnswerInput {
  email: string;
  securityQuestion: string;
  securityAnswer: string;
}

export interface ResetPasswordInput {
  email: string;
  newPassword: string;
  securityQuestion: string;
  securityAnswer: string;
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth', { email, password });
}

/**
 * Register new user
 */
export async function register(input: RegisterInput): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/api/auth/register', input);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/api/auth/forgot-password', { email });
}

/**
 * Check username exists for password reset
 */
export async function checkUsername(email: string): Promise<{ exists: boolean }> {
  return apiPost<{ exists: boolean }>('/api/auth/forgot-password/check-username', { email });
}

/**
 * Verify security answer for password reset
 */
export async function verifySecurityAnswer(input: VerifySecurityAnswerInput): Promise<{ valid: boolean }> {
  return apiPost<{ valid: boolean }>('/api/auth/forgot-password/verify-security', input);
}

/**
 * Reset password with security answer
 */
export async function resetPassword(input: ResetPasswordInput): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/api/auth/forgot-password/reset', input);
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; message?: string }> {
  return apiGet<{ success: boolean; message?: string }>(`/api/auth/verify-email?token=${token}`);
}

/**
 * Resend verification email
 */
export async function resendVerification(email: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/api/auth/resend-verification', { email });
}
