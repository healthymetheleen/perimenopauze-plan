import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getAuthToken, clearAuth } from './api-client';

// User type matching backend
interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_premium: boolean;
  created_at: string;
  profile?: {
    date_of_birth: string | null;
    height: number | null;
    weight: number | null;
    language: string;
    notifications_enabled: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = getAuthToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.auth.me();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token invalid, clear it
          clearAuth();
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.auth.login(email, password);

      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      // Fetch user data
      const userResponse = await api.auth.me();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const response = await api.auth.signup(email, password, fullName);

      if (!response.success) {
        throw new Error(response.error || 'Signup failed');
      }

      // Fetch user data
      const userResponse = await api.auth.me();
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
