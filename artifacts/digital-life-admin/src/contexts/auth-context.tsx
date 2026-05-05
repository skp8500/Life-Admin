import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  credits: number;
  authMethod: string;
  googleId: string | null;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerWithCredentials: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setCredits: (n: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      message = data.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const loginWithCredentials = async (email: string, password: string) => {
    const data = await api<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
  };

  const registerWithCredentials = async (name: string, email: string, password: string) => {
    const data = await api<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const setCredits = (n: number) => {
    setUser((u) => (u ? { ...u, credits: n } : u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, loginWithCredentials, registerWithCredentials, logout, setCredits }}>
      {children}
    </AuthContext.Provider>
  );
}
