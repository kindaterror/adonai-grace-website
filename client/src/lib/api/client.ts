/**
 * Centralized API Client
 * 
 * Provides consistent fetch wrapper with authentication handling.
 * All API calls should go through this client for consistent
 * headers, error handling, and token management.
 */

const API_BASE = ''; // Relative URL - same origin

/**
 * Get auth token from localStorage
 */
function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

/**
 * Build headers with optional auth
 */
function buildHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

/**
 * Make an API request with consistent error handling
 */
export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  includeAuth = true
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: buildHeaders(includeAuth),
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(
  path: string,
  includeAuth = true
): Promise<T> {
  return apiRequest<T>('GET', path, undefined, includeAuth);
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
  includeAuth = true
): Promise<T> {
  return apiRequest<T>('POST', path, body, includeAuth);
}

/**
 * PUT request
 */
export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
  includeAuth = true
): Promise<T> {
  return apiRequest<T>('PUT', path, body, includeAuth);
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(
  path: string,
  includeAuth = true
): Promise<T> {
  return apiRequest<T>('DELETE', path, undefined, includeAuth);
}

/**
 * Upload file to endpoint
 */
export async function apiUpload<T = unknown>(
  path: string,
  file: File,
  folder?: string
): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  if (folder) {
    formData.append('folder', folder);
  }

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
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

// Re-export for backward compatibility
export { getToken };
