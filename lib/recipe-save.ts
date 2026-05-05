import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { uploadPhoto, deletePhoto, PHOTO_BUCKET } from '@/lib/storage';
import type { IngredientDraft } from '@/components/ingredient-row';
import type { StepDraft } from '@/components/step-row';
import type { DifficultyLevel } from '@/types/app';

export type RecipeFormInput = {
  user: { id: string };
  recipeId?: string;
  isEdit: boolean;
  name: string;
  description: string;
  difficulty: DifficultyLevel;
  baseServings: string;
  prepTime: string;
  cookTime: string;
  notes: string;
  referenceUrl: string;
  parentId: string | null;
  selectedCategories: number[];
  selectedMethods: number[];
  selectedSauceIds: string[];
  ingredients: IngredientDraft[];
  steps: StepDraft[];
  origIngredientIds: string[];
  origStepIds: string[];
  photoUri: string | null;
  existingPhotoPath: string | null;
};

export type SaveResult =
  | { ok: true; photoError?: string }
  | { ok: false; error: string };

export async function saveRecipe(input: RecipeFormInput): Promise<SaveResult> {
  try {
    const recipeData = {
      user_id: input.user.id,
      name: input.name.trim(),
      description: input.description.trim() || null,
      difficulty: input.difficulty,
      base_servings: parseInt(input.baseServings) || 4,
      prep_time_min: parseInt(input.prepTime) || 0,
      cook_time_min: parseInt(input.cookTime) || 0,
      notes: input.notes.trim() || null,
      reference_url: input.referenceUrl.trim() || null,
      parent_recipe_id: input.parentId ?? null,
    };

    let finalRecipeId = input.recipeId ?? '';

    if (input.isEdit && input.recipeId) {
      const { error } = await supabase.from('recipes').update(recipeData).eq('id', input.recipeId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert(recipeData)
        .select('id')
        .single();
      if (error) throw error;
      finalRecipeId = data.id;
    }

    let photoError: string | undefined;
    if (input.photoUri && !input.photoUri.startsWith('https://')) {
      try {
        const savedPath = await uploadRecipePhoto({
          photoUri: input.photoUri,
          userId: input.user.id,
          recipeId: finalRecipeId,
        });
        if (savedPath) {
          await supabase.from('recipes').update({ photo_url: savedPath }).eq('id', finalRecipeId);
          if (input.existingPhotoPath) await deletePhoto(input.existingPhotoPath);
        } else {
          photoError = 'La receta se guardó pero la foto no pudo subirse.';
        }
      } catch (e: any) {
        photoError = `La receta se guardó. Foto: ${e.message}`;
      }
    }

    const validIngredients = input.ingredients.filter(
      (i) => i.name.trim() && i.quantity.trim() && i.unit.trim()
    );
    const validSteps = input.steps.filter((s) => s.description.trim());

    if (input.isEdit) {
      await syncJoinTablesEdit(finalRecipeId, input);
      await syncIngredientsEdit(finalRecipeId, validIngredients, input.origIngredientIds);
      await syncStepsEdit(finalRecipeId, validSteps, input.origStepIds);
    } else {
      await insertJoinTablesCreate(finalRecipeId, input);
      await insertIngredientsCreate(finalRecipeId, validIngredients);
      await insertStepsCreate(finalRecipeId, validSteps);
    }

    return photoError ? { ok: true, photoError } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'No se pudo guardar la receta' };
  }
}

async function uploadRecipePhoto({
  photoUri,
  userId,
  recipeId,
}: {
  photoUri: string;
  userId: string;
  recipeId: string;
}): Promise<string | null> {
  if (Platform.OS === 'web') {
    const response = await fetch(photoUri);
    const arrayBuffer = await response.arrayBuffer();
    return uploadPhoto(userId, recipeId, arrayBuffer);
  }

  // iOS/Android: leer archivo como base64 → Uint8Array → fetch HTTPS directo
  // Evita el polyfill de fetch con file:// y el enum FileSystemUploadType
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: 'base64' as any,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesión expirada');

  const storagePath = `${userId}/${recipeId}-${Date.now()}.jpg`;
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'image/jpeg',
      },
      body: bytes,
    }
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return storagePath;
}

async function syncJoinTablesEdit(
  recipeId: string,
  { selectedCategories, selectedMethods, selectedSauceIds }: RecipeFormInput
) {
  if (selectedCategories.length > 0) {
    await supabase.from('recipe_categories').upsert(
      selectedCategories.map((category_id) => ({ recipe_id: recipeId, category_id })),
      { onConflict: 'recipe_id,category_id', ignoreDuplicates: true }
    );
    await supabase.from('recipe_categories').delete().eq('recipe_id', recipeId)
      .not('category_id', 'in', `(${selectedCategories.join(',')})`);
  } else {
    await supabase.from('recipe_categories').delete().eq('recipe_id', recipeId);
  }

  if (selectedMethods.length > 0) {
    await supabase.from('recipe_methods').upsert(
      selectedMethods.map((method_id) => ({ recipe_id: recipeId, method_id })),
      { onConflict: 'recipe_id,method_id', ignoreDuplicates: true }
    );
    await supabase.from('recipe_methods').delete().eq('recipe_id', recipeId)
      .not('method_id', 'in', `(${selectedMethods.join(',')})`);
  } else {
    await supabase.from('recipe_methods').delete().eq('recipe_id', recipeId);
  }

  if (selectedSauceIds.length > 0) {
    await supabase.from('recipe_sauces').upsert(
      selectedSauceIds.map((sauce_recipe_id) => ({ recipe_id: recipeId, sauce_recipe_id })),
      { onConflict: 'recipe_id,sauce_recipe_id', ignoreDuplicates: true }
    );
    await supabase.from('recipe_sauces').delete().eq('recipe_id', recipeId)
      .not('sauce_recipe_id', 'in', `(${selectedSauceIds.join(',')})`);
  } else {
    await supabase.from('recipe_sauces').delete().eq('recipe_id', recipeId);
  }
}

async function syncIngredientsEdit(
  recipeId: string,
  validIngredients: IngredientDraft[],
  origIds: string[]
) {
  const keptIds = validIngredients.filter((i) => !i.id.startsWith('local_')).map((i) => i.id);
  const upsert = validIngredients.filter((i) => !i.id.startsWith('local_'));
  const insert = validIngredients.filter((i) => i.id.startsWith('local_'));

  if (upsert.length > 0) {
    await supabase.from('ingredients').upsert(
      upsert.map((ing) => ({
        id: ing.id,
        recipe_id: recipeId,
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity) || 0,
        unit: ing.unit.trim(),
        order_index: validIngredients.findIndex((x) => x.id === ing.id),
      }))
    );
  }
  if (insert.length > 0) {
    await supabase.from('ingredients').insert(
      insert.map((ing) => ({
        recipe_id: recipeId,
        name: ing.name.trim(),
        quantity: parseFloat(ing.quantity) || 0,
        unit: ing.unit.trim(),
        order_index: validIngredients.findIndex((x) => x.id === ing.id),
      }))
    );
  }
  const removed = origIds.filter((id) => !keptIds.includes(id));
  if (removed.length > 0) {
    await supabase.from('ingredients').delete().in('id', removed);
  }
}

async function syncStepsEdit(
  recipeId: string,
  validSteps: StepDraft[],
  origIds: string[]
) {
  const keptIds = validSteps.filter((s) => !s.id.startsWith('local_')).map((s) => s.id);
  const upsert = validSteps.filter((s) => !s.id.startsWith('local_'));
  const insert = validSteps.filter((s) => s.id.startsWith('local_'));

  if (upsert.length > 0) {
    await supabase.from('steps').upsert(
      upsert.map((step) => ({
        id: step.id,
        recipe_id: recipeId,
        description: step.description.trim(),
        order_index: validSteps.findIndex((x) => x.id === step.id),
      }))
    );
  }
  if (insert.length > 0) {
    await supabase.from('steps').insert(
      insert.map((step) => ({
        recipe_id: recipeId,
        description: step.description.trim(),
        order_index: validSteps.findIndex((x) => x.id === step.id),
      }))
    );
  }
  const removed = origIds.filter((id) => !keptIds.includes(id));
  if (removed.length > 0) {
    await supabase.from('steps').delete().in('id', removed);
  }
}

async function insertJoinTablesCreate(
  recipeId: string,
  { selectedCategories, selectedMethods, selectedSauceIds }: RecipeFormInput
) {
  if (selectedCategories.length > 0) {
    await supabase.from('recipe_categories').insert(
      selectedCategories.map((category_id) => ({ recipe_id: recipeId, category_id }))
    );
  }
  if (selectedMethods.length > 0) {
    await supabase.from('recipe_methods').insert(
      selectedMethods.map((method_id) => ({ recipe_id: recipeId, method_id }))
    );
  }
  if (selectedSauceIds.length > 0) {
    await supabase.from('recipe_sauces').insert(
      selectedSauceIds.map((sauce_recipe_id) => ({ recipe_id: recipeId, sauce_recipe_id }))
    );
  }
}

async function insertIngredientsCreate(recipeId: string, validIngredients: IngredientDraft[]) {
  if (validIngredients.length === 0) return;
  await supabase.from('ingredients').insert(
    validIngredients.map((ing, idx) => ({
      recipe_id: recipeId,
      name: ing.name.trim(),
      quantity: parseFloat(ing.quantity) || 0,
      unit: ing.unit.trim(),
      order_index: idx,
    }))
  );
}

async function insertStepsCreate(recipeId: string, validSteps: StepDraft[]) {
  if (validSteps.length === 0) return;
  await supabase.from('steps').insert(
    validSteps.map((step, idx) => ({
      recipe_id: recipeId,
      description: step.description.trim(),
      order_index: idx,
    }))
  );
}
