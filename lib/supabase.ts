import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isBrowser = typeof localStorage !== 'undefined';
const CHUNK_SIZE = 1800;
// AFTER_FIRST_UNLOCK permite acceso en background (auto-refresh de Supabase)
const KCA = SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;
const MAX_CHUNKS = 10;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return isBrowser ? localStorage.getItem(key) : null;
    }
    const chunk0 = await SecureStore.getItemAsync(`${key}.0`, { keychainAccessible: KCA });
    if (chunk0 === null) {
      // valor sin chunks (legacy o valor pequeño)
      return SecureStore.getItemAsync(key, { keychainAccessible: KCA });
    }
    const parts = [chunk0];
    for (let i = 1; i < MAX_CHUNKS; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}.${i}`, { keychainAccessible: KCA });
      if (chunk === null) break;
      parts.push(chunk);
    }
    return parts.join('');
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isBrowser) localStorage.setItem(key, value);
      return;
    }
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value, { keychainAccessible: KCA });
      // limpiar chunks anteriores si existían
      await SecureStore.deleteItemAsync(`${key}.0`, { keychainAccessible: KCA });
      return;
    }
    const numChunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < numChunks; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        { keychainAccessible: KCA }
      );
    }
    await SecureStore.deleteItemAsync(key, { keychainAccessible: KCA });
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (isBrowser) localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key, { keychainAccessible: KCA });
    for (let i = 0; i < MAX_CHUNKS; i++) {
      await SecureStore.deleteItemAsync(`${key}.${i}`, { keychainAccessible: KCA });
    }
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
