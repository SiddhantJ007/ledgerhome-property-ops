import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { getPasswordResetRedirectUrl } from '@/lib/auth-redirect';
import { DEMO_MODE } from '@/lib/demo-mode';
import { resetBackendAvailabilityForSession } from '@/lib/backend-availability';
import { setRuntimeAuthSessionActive } from '@/lib/runtime-auth-state';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { AppRole } from '@/types/domain';

type SignInCredentials = {
  email: string;
  expectedRole?: AppRole;
  password: string;
};

type AuthContextValue = {
  configError: string | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  isLoading: boolean;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  session: Session | null;
  signInWithPassword: (credentials: SignInCredentials) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const BACKGROUND_SIGN_OUT_TIMEOUT_MS = 10 * 60 * 1000;

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);
  const initialLaunchSessionHandledRef = useRef(false);

  useEffect(() => {
    if (DEMO_MODE) {
      setIsLoading(false);
      setSession(null);
      setIsPasswordRecovery(false);
      setRuntimeAuthSessionActive(false);
      return;
    }

    if (!supabase) {
      setIsLoading(false);
      setSession(null);
      setIsPasswordRecovery(false);
      setRuntimeAuthSessionActive(false);
      return;
    }

    const client = supabase;

    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
        sessionRef.current = null;
        setIsPasswordRecovery(false);
        setRuntimeAuthSessionActive(false);
      } else {
        if (data.session) {
          await client.auth.signOut();
          setSession(null);
          sessionRef.current = null;
          setIsPasswordRecovery(false);
          setRuntimeAuthSessionActive(false);
        } else {
          setSession(null);
          sessionRef.current = null;
          setIsPasswordRecovery(false);
          setRuntimeAuthSessionActive(false);
        }

        initialLaunchSessionHandledRef.current = true;
        setIsPasswordRecovery(false);
        resetBackendAvailabilityForSession();
      }

      setIsLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!initialLaunchSessionHandledRef.current && nextSession) {
        initialLaunchSessionHandledRef.current = true;
        void client.auth.signOut();
        return;
      }

      if (!initialLaunchSessionHandledRef.current) {
        initialLaunchSessionHandledRef.current = true;
      }

      setSession(nextSession);
      sessionRef.current = nextSession;
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY');
      setRuntimeAuthSessionActive(Boolean(nextSession));
      resetBackendAvailabilityForSession();
      setIsLoading(false);
    });

    let backgroundedAt: number | null = null;

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (!sessionRef.current) {
        backgroundedAt = null;
        return;
      }

      if (nextState === 'active') {
        resetBackendAvailabilityForSession();
        if (backgroundedAt && Date.now() - backgroundedAt >= BACKGROUND_SIGN_OUT_TIMEOUT_MS) {
          void client.auth.signOut();
        }

        backgroundedAt = null;
        return;
      }

      if (nextState === 'inactive' || nextState === 'background') {
        backgroundedAt = Date.now();
      }
    });

    return () => {
      isMounted = false;
      setRuntimeAuthSessionActive(false);
      appStateSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    configError: supabaseConfigError,
    isAuthenticated: Boolean(session),
    isConfigured: !supabaseConfigError,
    isPasswordRecovery,
    isLoading,
    requestPasswordReset: async (email) => {
      if (!supabase) {
        return {
          error: new Error(
            supabaseConfigError ??
              'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
        };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      return { error };
    },
    session,
    signInWithPassword: async ({ email, expectedRole, password }) => {
      if (!supabase) {
        return {
          error: new Error(
            supabaseConfigError ??
              'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
        };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (expectedRole) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (userId) {
          const { data: profileRow, error: profileError } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

          if (profileError || !profileRow) {
            await supabase.auth.signOut();

            return {
              error: new Error(
                expectedRole === 'admin'
                  ? 'This login is not linked to an admin account yet.'
                  : 'This login is not linked to a tenant account yet.'
              ),
            };
          }

          if (profileRow.role !== expectedRole) {
            await supabase.auth.signOut();

            return {
              error: new Error(
                expectedRole === 'admin'
                  ? 'This email is linked to a tenant account. Use Tenant sign in.'
                  : 'This email is linked to an admin account. Use Admin sign in.'
              ),
            };
          }
        }
      }

      return { error: null };
    },
    signOut: async () => {
      if (!supabase) {
        return {
          error: new Error(
            supabaseConfigError ??
              'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
        };
      }

      const { error } = await supabase.auth.signOut();
      return { error };
    },
    updatePassword: async (password) => {
      if (!supabase) {
        return {
          error: new Error(
            supabaseConfigError ??
              'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
          ),
        };
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (!error) {
        setIsPasswordRecovery(false);
      }

      return { error };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
