// Central HTTP client for the FastAPI backend. Every request goes through
// apiRequest so errors, auth headers and base URL are handled in one place.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const TOKEN_KEY = 'tapcard.token';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
    public data: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: the session will last until the page reloads.
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

type Detail = string | { code?: string; message?: string; fields?: Record<string, string>; [key: string]: unknown };

function toApiError(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: Detail } | null)?.detail;
  if (typeof detail === 'string') return new ApiError(status, 'error', detail);
  if (detail && typeof detail === 'object') {
    const { code = 'error', message = 'Something went wrong. Please try again.', fields = {}, ...data } = detail;
    return new ApiError(status, code, message, fields, data);
  }
  return new ApiError(status, 'error', 'Something went wrong. Please try again.');
}

type Options = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH'; body?: unknown; auth?: boolean };

export async function apiRequest<T>(path: string, { method = 'GET', body, auth = false }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection and try again.');
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (auth && response.status === 401) {
      clearToken();
      unauthorizedListeners.forEach(listener => listener());
    }
    throw toApiError(response.status, data);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
