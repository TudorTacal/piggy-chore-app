import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Child } from '@/types/database';

interface UserInfo {
  name: string;
  gender: 'boy' | 'girl' | null;
  children: Child[];
  selectedChild: Child | null;
}

interface AuthContextType {
  session: Session | null;
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserInfo: (info: { name: string; gender: 'boy' | 'girl' }) => Promise<void>;
  selectChild: (child: Child) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  userInfo: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  setUserInfo: async () => {},
  selectChild: () => {},
});

const QUERY_TIMEOUT = 10000; // 10 seconds timeout

// Helper function to create a timeout promise
const createTimeout = (ms: number) => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timed out')), ms)
  );

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserInfo = async (userId: string) => {
    console.log('🔍 Loading user info for:', userId);
    
    try {
      // First get the user info
      const userQuery = supabase
        .from('users')
        .select('name, gender')
        .eq('id', userId)
        .single();

      // Only use Promise.race on web platform
      const { data: userData, error: userError } = await (Platform.OS === 'web' 
        ? Promise.race([
            userQuery,
            createTimeout(QUERY_TIMEOUT)
          ])
        : userQuery);

      if (userError) {
        console.error('❌ Error loading user info:', userError);
        throw userError;
      }

      // Then get the children
      const childrenQuery = supabase
        .from('parent_child_relationships')
        .select(`
          child:children (
            id,
            name,
            avatar_url,
            created_at,
            updated_at,
            child_balances (
              amount
            )
          )
        `)
        .eq('parent_id', userId)
        .eq('relationship_type', 'parent');

      const { data: childrenData, error: childrenError } = await (Platform.OS === 'web'
        ? Promise.race([
            childrenQuery,
            createTimeout(QUERY_TIMEOUT)
          ])
        : childrenQuery);

      if (childrenError) {
        console.error('❌ Error loading children:', childrenError);
        throw childrenError;
      }

      const children = childrenData?.map(rel => rel.child) ?? [];
      
      if (userData) {
        console.log('✅ User info loaded:', { userData, children });
        setUserInfoState({
          ...userData,
          children,
          selectedChild: children.length > 0 ? children[0] : null,
        });
        console.log('✅ User info state set successfully');
      } else {
        console.warn('⚠️ No user data found');
        // Create initial user record if none exists
        const { error: insertError } = await supabase
          .from('users')
          .insert({ id: userId })
          .single();

        if (insertError) {
          console.error('❌ Error creating initial user record:', insertError);
          throw insertError;
        }
      }
    } catch (err) {
      if (err && (err as Error).message) {
        console.error('❌ Error in loadUserInfo:', err);
        setError((err as Error).message);
      } else {
        console.warn('⚚ Caught empty error, ignoring');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    console.log('🚀 Initializing auth context');

    async function initializeAuth() {
      try {
        console.log('📡 Getting initial session');
        setIsLoading(true);
        
        const sessionPromise = supabase.auth.getSession();
        const { data: { session }, error: sessionError } = await (Platform.OS === 'web'
          ? Promise.race([
              sessionPromise,
              createTimeout(QUERY_TIMEOUT)
            ])
          : sessionPromise);
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }
        
        if (mounted) {
          console.log('🔑 Initial session:', session ? 'exists' : 'null');
          setSession(session);
          
          if (session?.user) {
            console.log('👤 Loading initial user info for:', session.user.id);
            await loadUserInfo(session.user.id);
          } else {
            console.log('🚫 No initial session user');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        if (mounted) {
          setError((err as Error).message);
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'Session:', session ? 'exists' : 'null');
        if (mounted) {
          setSession(session);
          
          if (session?.user) {
            console.log('👤 Reloading user info after auth change for:', session.user.id);
            await loadUserInfo(session.user.id);
          } else {
            console.log('🚫 No session after auth change, clearing user info');
            setUserInfoState(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth context');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Attempting sign in');
    try {
      setIsLoading(true);
      setError(null);
      
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await (Platform.OS === 'web'
        ? Promise.race([
            signInPromise,
            createTimeout(QUERY_TIMEOUT)
          ])
        : signInPromise);

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }
      if (!data.user) {
        console.error('❌ No user data after sign in');
        throw new Error('No user data');
      }

      console.log('✅ Sign in successful for:', data.user.id);
      setSession(data.session);
      await loadUserInfo(data.user.id);
    } catch (err) {
      console.error('❌ Sign in error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    console.log('📝 Attempting sign up');
    try {
      setIsLoading(true);
      setError(null);
      
      const signUpPromise = supabase.auth.signUp({
        email,
        password,
      });

      const { data, error } = await (Platform.OS === 'web'
        ? Promise.race([
            signUpPromise,
            createTimeout(QUERY_TIMEOUT)
          ])
        : signUpPromise);

      if (error) {
        console.error('❌ Sign up error:', error);
        throw error;
      }
      if (!data.user) {
        console.error('❌ No user data after sign up');
        throw new Error('No user data');
      }

      console.log('✅ Sign up successful for:', data.user.id);
      setSession(data.session);
    } catch (err) {
      console.error('❌ Sign up error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🚪 Attempting sign out');
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear state first to prevent navigation issues
      setSession(null);
      setUserInfoState(null);
      
      const signOutPromise = supabase.auth.signOut();
      const { error } = await (Platform.OS === 'web'
        ? Promise.race([
            signOutPromise,
            createTimeout(QUERY_TIMEOUT)
          ])
        : signOutPromise);

      if (error) {
        console.error('❌ Sign out error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
    } catch (err) {
      console.error('❌ Sign out error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const setUserInfo = async (info: { name: string; gender: 'boy' | 'girl' }) => {
    console.log('✏️ Updating user info');
    try {
      setIsLoading(true);
      setError(null);
      
      const getUserPromise = supabase.auth.getUser();
      const { data: { user }, error: userError } = await (Platform.OS === 'web'
        ? Promise.race([
            getUserPromise,
            createTimeout(QUERY_TIMEOUT)
          ])
        : getUserPromise);

      if (userError) throw userError;
      if (!user) {
        console.error('❌ Not authenticated');
        throw new Error('Not authenticated');
      }

      const updatePromise = supabase
        .from('users')
        .upsert({ 
          id: user.id,
          name: info.name,
          gender: info.gender,
        });

      const { error } = await (Platform.OS === 'web'
        ? Promise.race([
            updatePromise,
            createTimeout(QUERY_TIMEOUT)
          ])
        : updatePromise);

      if (error) {
        console.error('❌ Error updating user info:', error);
        throw error;
      }

      console.log('✅ User info updated for:', user.id);
      await loadUserInfo(user.id);
    } catch (err) {
      console.error('❌ Update user info error:', err);
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const selectChild = (child: Child) => {
    if (!userInfo) return;
    setUserInfoState({
      ...userInfo,
      selectedChild: child,
    });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        session, 
        userInfo, 
        isLoading, 
        error, 
        signIn,
        signUp,
        signOut,
        setUserInfo,
        selectChild,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}