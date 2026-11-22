import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError } from './api';
import type { User } from './types';
import { queryClient } from './queryClient';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get<User>('/auth/me/')
      .then((me) => {
        if (alive) setUser(me);
      })
      .catch((err: unknown) => {
        if (alive && err instanceof ApiError && err.status === 401) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.post<User>('/auth/login/', { username, password });
    setUser(me);
    await queryClient.invalidateQueries();
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const me = await api.post<User>('/auth/signup/', { username, email, password });
    setUser(me);
    await queryClient.invalidateQueries();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/', {});
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}
