import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to auth changes. Supabase emits an INITIAL_SESSION event on init,
    // so we don't need an extra concurrent getSession() call here (which can
    // trigger navigatorLock timeouts in gotrue-js).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Safety fallback: if, for any reason, INITIAL_SESSION doesn't arrive,
    // do a single session check after a short delay.
    const fallback = window.setTimeout(() => {
      if (!isMounted) return;
      // Only run if we're still loading.
      setLoading((prev) => {
        if (!prev) return prev;
        void supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (!isMounted) return;
            setSession(session);
            setUser(session?.user ?? null);
          })
          .catch(() => {
            // Ignore: we'll just leave session/user as null
          })
          .finally(() => {
            if (!isMounted) return;
            setLoading(false);
          });
        return prev;
      });
    }, 800);

    return () => {
      isMounted = false;
      window.clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}