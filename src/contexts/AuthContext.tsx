import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser, getCurrentUser, logout as authLogout } from '@/lib/auth';
import type { Session } from '@supabase/supabase-js';

const WELCOME_QUOTES = [
  'Code is poetry written in logic. ✨',
  'Every expert was once a beginner. Keep pushing. 🚀',
  'The best way to predict the future is to build it. 💡',
  'Small steps every day beat big leaps once a year. 🔥',
  'Your consistency is your superpower. 💪',
  'Learn. Build. Repeat. That is the algorithm. ⚡',
  'Great things take time — you are right on schedule. 🌱',
  'Curiosity today, breakthroughs tomorrow. 🧠',
  'Debug the code, not your self-worth. 💙',
  'One commit at a time — you are shaping the future. 🌟',
];

function fireWelcomeToast(name?: string | null) {
  const quote = WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)];
  const firstName = (name || '').split(' ')[0] || 'there';
  toast(`Hello ${firstName} 👋`, {
    description: quote,
    duration: 6000,
  });
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (): Promise<AuthUser | null> => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // Hydrate immediately from the cached session — avoids waiting on a full
    // getCurrentUser() round-trip before the app can render.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        refreshUser().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          const currentUser = await refreshUser();
          setLoading(false);
          if (event === 'SIGNED_IN') {
            const key = `welcomed:${session.user.id}:${session.access_token.slice(-12)}`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1');
              fireWelcomeToast(currentUser?.name);
            }
          }
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  const logout = async () => {
    await authLogout();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
