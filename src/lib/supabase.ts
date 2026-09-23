import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isClient = Platform.OS !== 'web' || typeof window !== 'undefined';
export const supabase = url && key && isClient ? createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    storageKey: 'karla-supervisor-auth-v1',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (input, init) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    },
  },
}) : null;

let accountRequest: Promise<string> | null = null;

export function getDemoAccountId(): Promise<string> {
  if (!!url !== !!key) return Promise.reject(new Error('Both Supabase environment variables must be set.'));
  if (!supabase) return Promise.resolve('local-demo');
  // Share the initial sign-in between Home and the wizard.
  if (!accountRequest) {
    accountRequest = (async () => {
      const client = supabase!;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data.session) return data.session.user.id;
      const result = await client.auth.signInAnonymously();
      if (result.error || !result.data.user) throw result.error ?? new Error('Could not start demo account.');
      return result.data.user.id;
    })().finally(() => { accountRequest = null; });
  }
  return accountRequest;
}
