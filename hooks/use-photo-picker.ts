import { useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { deletePhoto } from '@/lib/storage';

async function convertHeicToJpeg(uri: string): Promise<string | null> {
  // Approach 1: Canvas — Safari decodes HEIC natively via macOS
  try {
    return await new Promise<string>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = reject;
      img.src = uri;
    });
  } catch {}

  // Approach 2: WebCodecs ImageDecoder — Chrome ≥105 on macOS uses system HEIC codec
  try {
    const ID = (window as any).ImageDecoder;
    if (ID && await ID.isTypeSupported('image/heic')) {
      const res = await fetch(uri);
      const buffer = await res.arrayBuffer();
      const decoder = new ID({ data: buffer, type: 'image/heic' });
      const { image } = await decoder.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.displayWidth;
      canvas.height = image.displayHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      image.close();
      return canvas.toDataURL('image/jpeg', 0.9);
    }
  } catch {}

  // Approach 3: libheif-js wasm-bundle — libheif 1.19 supports iPhone HEVC
  try {
    const libheif = (await import('libheif-js/wasm-bundle')).default;
    const res = await fetch(uri);
    const buffer = await res.arrayBuffer();
    const decoder = new libheif.HeifDecoder();
    const data = decoder.decode(new Uint8Array(buffer));
    const image = data[0];
    const width = image.get_width();
    const height = image.get_height();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    await new Promise<void>((resolve, reject) => {
      image.display(imageData, (displayData: any) => {
        if (!displayData) { reject(new Error('decode failed')); return; }
        ctx.putImageData(imageData, 0, 0);
        resolve();
      });
    });
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {}

  alert(
    'No se pudo convertir la foto HEIC.\n\n' +
    'Opciones:\n' +
    '• Usa Safari (soporta HEIC de forma nativa)\n' +
    '• Abre la foto en Preview → Archivo → Exportar → elige JPEG'
  );
  return null;
}

export function usePhotoPicker(recipeId?: string) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (result.canceled) return;

    let uri = result.assets[0].uri;

    if (Platform.OS === 'web') {
      const mime = result.assets[0].mimeType ?? '';
      const fileName = result.assets[0].fileName ?? '';
      const isHeic = mime === 'image/heic' || mime === 'image/heif'
        || /\.(heic|heif)$/i.test(fileName);
      if (isHeic) {
        const converted = await convertHeicToJpeg(uri);
        if (!converted) return;
        uri = converted;
      }
    }

    const processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPhotoUri(processed.uri);
  };

  const removePhoto = async () => {
    setPhotoUri(null);
    if (existingPhotoPath) {
      await deletePhoto(existingPhotoPath);
      if (recipeId) {
        await supabase.from('recipes').update({ photo_url: null }).eq('id', recipeId);
      }
      setExistingPhotoPath(null);
    }
  };

  return {
    photoUri,
    setPhotoUri,
    existingPhotoPath,
    setExistingPhotoPath,
    pickPhoto,
    removePhoto,
  };
}
