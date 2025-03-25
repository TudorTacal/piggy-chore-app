import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

interface UserState {
  name: string;
  gender: 'boy' | 'girl' | null;
  coins: number;
  currency: 'GBP' | 'USD';
  isLoading: boolean;
  error: string | null;
  setUserInfo: (info: { name: string; gender: 'boy' | 'girl' }) => Promise<void>;
  addCoins: (amount: number) => Promise<void>;
  resetCoins: () => Promise<void>;
  setCurrency: (currency: 'GBP' | 'USD') => void;
  loadState: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useStore = create<UserState>((set, get) => ({
  name: '',
  gender: null,
  coins: 0,
  currency: 'GBP',
  isLoading: false,
  error: null,

  setUserInfo: async (info) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .upsert({ 
          id: user.id,
          name: info.name,
          gender: info.gender,
        });

      if (error) throw error;

      set({ ...info, isLoading: false });
      await AsyncStorage.setItem('userInfo', JSON.stringify(info));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addCoins: async (amount) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('add_balance', {
        user_id: user.id,
        amount: amount
      });

      if (error) throw error;

      set(state => ({ coins: state.coins + amount, isLoading: false }));
      await AsyncStorage.setItem('coins', (get().coins + amount).toString());
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  resetCoins: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ balance: 0 })
        .eq('id', user.id);

      if (error) throw error;

      set({ coins: 0, isLoading: false });
      await AsyncStorage.setItem('coins', '0');
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setCurrency: (currency) => {
    set({ currency });
    AsyncStorage.setItem('currency', currency);
  },

  loadState: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .single();

      if (userError) throw userError;

      if (user) {
        set({
          name: user.name,
          gender: user.gender,
          coins: user.balance,
          isLoading: false,
        });
      }

      const currencyStr = await AsyncStorage.getItem('currency');
      if (currencyStr) {
        set({ currency: currencyStr as 'GBP' | 'USD' });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user data');

      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user data');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) throw userError;

      set({
        name: userData.name,
        gender: userData.gender,
        coins: userData.balance,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        name: '',
        gender: null,
        coins: 0,
        isLoading: false,
      });

      await AsyncStorage.multiRemove(['userInfo', 'coins']);
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));