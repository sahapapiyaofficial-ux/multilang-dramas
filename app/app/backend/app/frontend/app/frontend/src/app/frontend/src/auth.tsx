"import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthApi, tokenStore, User } from './api';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await tokenStore.get();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const me = await AuthApi.me();
      setUser(me);
    } catch {
      await tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    const data = await AuthApi.login(email, password);
    await tokenStore.set(data.access_token);
    setUser(data.user);
  };
  const signUp = async (email: string, password: string, name?: string) => {
    const data = await AuthApi.register(email, password, name);
    await tokenStore.set(data.access_token);
    setUser(data.user);
  };
  const signOut = async () => {
    await tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
"
Observation: Create successful: /app/frontend/src/auth.tsx
