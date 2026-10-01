import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { setApiAuthStateHandler } from '../../services/api';
import { getCurrentUser, login, logoutSession, refreshSession } from './auth.api';
import type { AuthUser } from './auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const removeAuthStateHandler = setApiAuthStateHandler((nextAccessToken) => {
      if (!active) return;

      setAccessToken(nextAccessToken);

      if (!nextAccessToken) {
        setUser(null);
      }
    });

    async function restoreSession() {
      try {
        const response = await refreshSession();

        if (!active) return;

        const currentUser = await getCurrentUser(response.access_token);

        if (!active) return;

        setAccessToken(response.access_token);
        setUser(currentUser);
      } catch {
        if (!active) return;

        setAccessToken(null);
        setUser(null);
      } finally {
        if (active) setIsInitializing(false);
      }
    }

    void restoreSession();

    return () => {
      active = false;
      removeAuthStateHandler();
    };
  }, []);

  async function loginUser(email: string, password: string) {
    const response = await login({
      email,
      password,
    });

    const currentUser = await getCurrentUser(response.access_token);

    setAccessToken(response.access_token);
    setUser(currentUser);
  }

  async function logout() {
    const currentAccessToken = accessToken;

    try {
      if (currentAccessToken) {
        await logoutSession(currentAccessToken);
      }
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isInitializing,
    loginUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {isInitializing ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}