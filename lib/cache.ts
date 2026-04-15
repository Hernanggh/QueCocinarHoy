import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export async function saveCache(key: string, data: unknown): Promise<void> {
  try {
    const json = JSON.stringify(data);
    if (Platform.OS === 'web') {
      localStorage.setItem(`qch_${key}`, json);
    } else {
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}qch_${key}.json`,
        json
      );
    }
  } catch {
    // Ignorar errores de escritura (ej. almacenamiento lleno)
  }
}

export async function loadCache<T>(key: string): Promise<T | null> {
  try {
    if (Platform.OS === 'web') {
      const json = localStorage.getItem(`qch_${key}`);
      return json ? (JSON.parse(json) as T) : null;
    } else {
      const path = `${FileSystem.documentDirectory}qch_${key}.json`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return null;
      return JSON.parse(await FileSystem.readAsStringAsync(path)) as T;
    }
  } catch {
    return null;
  }
}
