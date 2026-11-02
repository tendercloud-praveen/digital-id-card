import { createContext } from 'react';
import type { TokenResponse, User } from '@/lib/authApi';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  // Stores the token from login or email verification and signs the user in.
  startSession: (response: TokenResponse) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
