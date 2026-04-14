import { supabase } from '@/lib/supabase';

export const PHOTO_BUCKET = 'recipe-photos';
const BUCKET = PHOTO_BUCKET;

export function getPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPhoto(
  userId: string,
  recipeId: string,
  file: ArrayBuffer | Blob | File
): Promise<string | null> {
  const path = `${userId}/${recipeId}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: 'image/jpeg', upsert: true });
  if (error) {
    console.error('[storage] uploadPhoto error:', error.message, 'path:', path);
    return null;
  }
  return path;
}

export async function deletePhoto(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
