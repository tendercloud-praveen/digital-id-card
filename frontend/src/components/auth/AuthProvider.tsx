import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, clearToken, getToken, onUnauthorized, setToken } from '@/lib/api';
import { authApi, type TokenResponse, type User } from '@/lib/authApi';
import { AuthContext, type AuthStatus } from '@/lib/authContext';

function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const startSession = useCallback((response: TokenResponse) => {
    setToken(response.access_token);
    setTokenState(response.access_token);
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => onUnauthorized(logout), [logout]);

  // Restore the session on page load by asking the backend who the token belongs to.
  useEffect(() => {
    if (!token || user) return;
    let cancelled = false;
    authApi
      .me()
      .then(me => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // An invalid token is dropped. If the server is unreachable the token is
        // kept, so a later reload can restore the session once it is back.
        if (error instanceof ApiError && error.status === 401) logout();
        else setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, logout]);

  // Sign out automatically when the access token expires.
  useEffect(() => {
    const expiresAt = token ? tokenExpiry(token) : null;
    if (!expiresAt) return;
    const timer = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [token, logout]);

  const value = useMemo(() => ({ status, user, startSession, logout }), [status, user, startSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
