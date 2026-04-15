import { pc } from '@/lib/colors';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useLookupData } from '@/hooks/use-lookup-data';
import { useRecipes } from '@/hooks/use-recipes';
import { uploadPhoto, deletePhoto, getPublicUrl, PHOTO_BUCKET } from '@/lib/storage';
import { IngredientRow, type IngredientDraft } from '@/components/ingredient-row';
import { StepRow, type StepDraft } from '@/components/step-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DifficultyColors, DifficultyLabels } from '@/constants/theme';
import type { DifficultyLevel } from '@/types/app';

let idCounter = 0;
const uid = () => `local_${++idCounter}_${Date.now()}`;

const isWeb = Platform.OS === 'web';

export default function RecipeFormScreen() {
  const router = useRouter();
  const { recipeId, parentRecipeId: parentRecipeIdParam } = useLocalSearchParams<{ recipeId?: string; parentRecipeId?: string }>();
  const isEdit = Boolean(recipeId);
  const { user } = useAuth();
  const { categories, methods } = useLookupData();
  const { recipes } = useRecipes();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('facil');
  const [baseServings, setBaseServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<number[]>([]);
  const [selectedSauceIds, setSelectedSauceIds] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string | null>(parentRecipeIdParam ?? null);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([
    { id: uid(), name: '', quantity: '', unit: '' },
  ]);
  const [steps, setSteps] = useState<StepDraft[]>([{ id: uid(), description: '' }]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sauce options: recetas con categoría "Salsas y aderezos" (excluir la receta actual en edición)
  const sauceCategory = categories.find((c) => c.name === 'Salsas y aderezos');
  const sauceOptions = recipes.filter(
    (r) =>
      r.id !== recipeId &&
      r.categories.some((c) => c.id === sauceCategory?.id)
  );

  // Load existing recipe for edit mode
  useEffect(() => {
    if (!isEdit || !recipeId) return;
    const recipe = recipes.find((r) => r.id === recipeId)
      ?? recipes.flatMap((r) => r.variations).find((v) => v.id === recipeId);
    if (!recipe) return;
    setName(recipe.name);
    setParentId(recipe.parent_recipe_id ?? null);
    setDescription(recipe.description ?? '');
    setDifficulty(recipe.difficulty);
    setBaseServings(String(recipe.base_servings));
    setPrepTime(recipe.prep_time_min ? String(recipe.prep_time_min) : '');
    setCookTime(recipe.cook_time_min ? String(recipe.cook_time_min) : '');
    setNotes(recipe.notes ?? '');
    setReferenceUrl(recipe.reference_url ?? '');
    setSelectedCategories(recipe.categories.map((c) => c.id));
    setSelectedMethods(recipe.methods.map((m) => m.id));
    setSelectedSauceIds(recipe.sauces.map((s) => s.id));
    setExistingPhotoPath(recipe.photo_url);
    if (recipe.photo_url) {
      const url = getPublicUrl(recipe.photo_url);
      if (url) setPhotoUri(url);
    }
    if (recipe.ingredients.length > 0) {
      setIngredients(
        recipe.ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: String(ing.quantity),
          unit: ing.unit,
        }))
      );
    }
    if (recipe.steps.length > 0) {
      setSteps(recipe.steps.map((s) => ({ id: s.id, description: s.description })));
    }
  }, [isEdit, recipeId, recipes]);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleMethod = (id: number) => {
    setSelectedMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleSauce = (id: string) => {
    setSelectedSauceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const processed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPhotoUri(processed.uri);
    }
  };

  const removePhoto = async () => {
    setPhotoUri(null);
    if (existingPhotoPath) {
      await deletePhoto(existingPhotoPath);
      await supabase.from('recipes').update({ photo_url: null }).eq('id', recipeId!);
      setExistingPhotoPath(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Agrega un nombre a la receta');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const recipeData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        difficulty,
        base_servings: parseInt(baseServings) || 4,
        prep_time_min: parseInt(prepTime) || 0,
        cook_time_min: parseInt(cookTime) || 0,
        notes: notes.trim() || null,
        reference_url: referenceUrl.trim() || null,
        parent_recipe_id: parentId ?? null,
      };

      let finalRecipeId = recipeId ?? '';

      if (isEdit && recipeId) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipeId);
        if (updateError) throw updateError;
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select('id')
          .single();
        if (error) throw error;
        finalRecipeId = data.id;
      }

      // Upload photo if new one selected
      if (photoUri && !photoUri.startsWith('https://')) {
        try {
          let savedPath: string | null = null;

          if (Platform.OS === 'web') {
            // Web: fetch funciona correctamente con blob:/data: URLs del browser
            if (existingPhotoPath) await deletePhoto(existingPhotoPath);
            const response = await fetch(photoUri);
            const arrayBuffer = await response.arrayBuffer();
            savedPath = await uploadPhoto(user.id, finalRecipeId, arrayBuffer);
          } else {
            // iOS/Android: leer archivo como base64 (nativo) → Uint8Array → fetch HTTPS
            // Evita el polyfill de fetch con file:// y el enum FileSystemUploadType
            const base64 = await FileSystem.readAsStringAsync(photoUri, {
              encoding: 'base64' as any,
            });
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sesión expirada');

            if (existingPhotoPath) await deletePhoto(existingPhotoPath);
            const storagePath = `${user.id}/${finalRecipeId}-${Date.now()}.jpg`;
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
            savedPath = storagePath;
          }

          if (savedPath) {
            await supabase.from('recipes').update({ photo_url: savedPath }).eq('id', finalRecipeId);
          } else {
            Alert.alert('Error con la foto', 'La receta se guardó pero la foto no pudo subirse.');
          }
        } catch (photoErr: any) {
          Alert.alert('Error con la foto', `La receta se guardó. Foto: ${photoErr.message}`);
        }
      }

      // Replace join table data
      await supabase.from('recipe_categories').delete().eq('recipe_id', finalRecipeId);
      await supabase.from('recipe_methods').delete().eq('recipe_id', finalRecipeId);
      await supabase.from('recipe_sauces').delete().eq('recipe_id', finalRecipeId);
      await supabase.from('ingredients').delete().eq('recipe_id', finalRecipeId);
      await supabase.from('steps').delete().eq('recipe_id', finalRecipeId);

      if (selectedCategories.length > 0) {
        await supabase.from('recipe_categories').insert(
          selectedCategories.map((category_id) => ({ recipe_id: finalRecipeId, category_id }))
        );
      }
      if (selectedMethods.length > 0) {
        await supabase.from('recipe_methods').insert(
          selectedMethods.map((method_id) => ({ recipe_id: finalRecipeId, method_id }))
        );
      }
      if (selectedSauceIds.length > 0) {
        await supabase.from('recipe_sauces').insert(
          selectedSauceIds.map((sauce_recipe_id) => ({
            recipe_id: finalRecipeId,
            sauce_recipe_id,
          }))
        );
      }

      const validIngredients = ingredients.filter(
        (i) => i.name.trim() && i.quantity.trim() && i.unit.trim()
      );
      if (validIngredients.length > 0) {
        await supabase.from('ingredients').insert(
          validIngredients.map((ing, idx) => ({
            recipe_id: finalRecipeId,
            name: ing.name.trim(),
            quantity: parseFloat(ing.quantity) || 0,
            unit: ing.unit.trim(),
            order_index: idx,
          }))
        );
      }

      const validSteps = steps.filter((s) => s.description.trim());
      if (validSteps.length > 0) {
        await supabase.from('steps').insert(
          validSteps.map((step, idx) => ({
            recipe_id: finalRecipeId,
            description: step.description.trim(),
            order_index: idx,
          }))
        );
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  const sectionLabel = (text: string) => (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: pc('secondaryLabel'),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
      }}
    >
      {text}
    </Text>
  );

  // Recetas base disponibles para seleccionar como padre (excluye la receta actual)
  const baseRecipesForParent = recipes.filter((r) => r.id !== recipeId);
  const parentRecipeName = parentId ? baseRecipesForParent.find((r) => r.id === parentId)?.name : null;

  const parentSelector = (
    <View>
      {sectionLabel('Receta base (variación)')}
      <Pressable
        onPress={() => setShowParentPicker(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground'),
          padding: 14,
          borderRadius: 10,
          borderCurve: 'continuous' as const,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ flex: 1, fontSize: 16, color: parentRecipeName ? pc('label') : pc('secondaryLabel') }}>
          {parentRecipeName ?? 'Ninguna (receta independiente)'}
        </Text>
        {parentId && (
          <Pressable
            onPress={(e) => { (e as any).stopPropagation?.(); setParentId(null); }}
            hitSlop={8}
          >
            <IconSymbol name="xmark" size={16} color={pc('secondaryLabel')} />
          </Pressable>
        )}
        <IconSymbol name="chevron.right" size={16} color={pc('secondaryLabel')} />
      </Pressable>
    </View>
  );

  const inputStyle = {
    backgroundColor: isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground'),
    padding: 14,
    borderRadius: 10,
    borderCurve: 'continuous' as const,
    fontSize: 16,
    color: pc('label'),
  };

  const difficultySelector = (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['facil', 'medio', 'dificil'] as DifficultyLevel[]).map((level) => {
        const selected = difficulty === level;
        return (
          <Pressable
            key={level}
            onPress={() => setDifficulty(level)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              borderCurve: 'continuous' as const,
              alignItems: 'center',
              backgroundColor: selected
                ? DifficultyColors[level]
                : (isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground')),
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: selected ? '#fff' : pc('label'),
              }}
            >
              {DifficultyLabels[level]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const photoPickerWeb = (
    <>
      {photoUri ? (
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: 12,
            borderCurve: 'continuous' as const,
            overflow: 'hidden',
          }}
        >
          <Pressable onPress={pickPhoto}>
            <Image
              source={{ uri: photoUri }}
              style={{ width: 160, height: 160 }}
              contentFit="cover"
            />
          </Pressable>
          <Pressable
            onPress={removePhoto}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconSymbol name="xmark" size={11} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pickPhoto}>
        <View
          style={{
            width: 160,
            height: 160,
            backgroundColor: pc('tertiarySystemBackground'),
            borderRadius: 12,
            borderCurve: 'continuous' as const,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text
            style={{
              color: pc('systemOrange'),
              fontSize: 13,
              fontWeight: '500',
              textAlign: 'center',
            }}
          >
            {'Clic para\nagregar foto'}
          </Text>
        </View>
        </Pressable>
      )}
    </>
  );

  const sharedSections = (
    <>
      {/* Tiempos y porciones */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {sectionLabel('Porciones')}
          <TextInput
            value={baseServings}
            onChangeText={setBaseServings}
            keyboardType="number-pad"
            placeholder="4"
            style={inputStyle}
          />
        </View>
        <View style={{ flex: 1 }}>
          {sectionLabel('Prep (min)')}
          <TextInput
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType="number-pad"
            placeholder="0"
            style={inputStyle}
          />
        </View>
        <View style={{ flex: 1 }}>
          {sectionLabel('Cocción (min)')}
          <TextInput
            value={cookTime}
            onChangeText={setCookTime}
            keyboardType="number-pad"
            placeholder="0"
            style={inputStyle}
          />
        </View>
      </View>

      {/* Categorías */}
      <View>
        {sectionLabel('Categorías')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((cat) => {
            const selected = selectedCategories.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selected
                    ? pc('systemOrange')
                    : (isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground')),
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: selected ? '600' : '400',
                    color: selected ? '#fff' : pc('label'),
                  }}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Métodos */}
      <View>
        {sectionLabel('Método de cocina')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {methods.map((method) => {
            const selected = selectedMethods.includes(method.id);
            return (
              <Pressable
                key={method.id}
                onPress={() => toggleMethod(method.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selected
                    ? pc('systemOrange')
                    : (isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground')),
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: selected ? '600' : '400',
                    color: selected ? '#fff' : pc('label'),
                  }}
                >
                  {method.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Ingredientes */}
      <View>
        {sectionLabel(parentId ? 'Ingredientes adicionales' : 'Ingredientes')}
        <View style={{ gap: 8 }}>
          {ingredients.map((ing, idx) => (
            <IngredientRow
              key={ing.id}
              ingredient={ing}
              onChange={(updated) =>
                setIngredients((prev) => prev.map((i, j) => (j === idx ? updated : i)))
              }
              onDelete={() =>
                setIngredients((prev) => prev.filter((_, j) => j !== idx))
              }
            />
          ))}
          <Pressable
            onPress={() =>
              setIngredients((prev) => [...prev, { id: uid(), name: '', quantity: '', unit: '' }])
            }
            style={{ alignItems: 'center', padding: 10 }}
          >
            <Text style={{ color: pc('systemOrange'), fontSize: 15, fontWeight: '500' }}>
              + Agregar ingrediente
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Pasos */}
      <View>
        {sectionLabel('Preparación')}
        <View style={{ gap: 10 }}>
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              index={idx}
              onChange={(updated) =>
                setSteps((prev) => prev.map((s, j) => (j === idx ? updated : s)))
              }
              onDelete={() => setSteps((prev) => prev.filter((_, j) => j !== idx))}
            />
          ))}
          <Pressable
            onPress={() => setSteps((prev) => [...prev, { id: uid(), description: '' }])}
            style={{ alignItems: 'center', padding: 10 }}
          >
            <Text style={{ color: pc('systemOrange'), fontSize: 15, fontWeight: '500' }}>
              + Agregar paso
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Salsas vinculadas */}
      {sauceOptions.length > 0 && (
        <View>
          {sectionLabel('Salsas y aderezos')}
          <View style={{ gap: 8 }}>
            {sauceOptions.map((sauce) => {
              const selected = selectedSauceIds.includes(sauce.id);
              return (
                <Pressable
                  key={sauce.id}
                  onPress={() => toggleSauce(sauce.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    borderCurve: 'continuous' as const,
                    backgroundColor: selected
                      ? pc('systemOrange') + '22'
                      : (isWeb ? pc('tertiarySystemBackground') : pc('secondarySystemBackground')),
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: selected ? pc('systemOrange') : pc('systemGray3'),
                      backgroundColor: selected ? pc('systemOrange') : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {selected && (
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 15, color: pc('label'), flex: 1 }}>
                    {sauce.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Notas */}
      <View>
        {sectionLabel('Notas personales')}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Tips, variaciones, recuerdos..."
          multiline
          style={[inputStyle, { minHeight: 80 }]}
        />
      </View>

      {/* URL de referencia */}
      <View>
        {sectionLabel('Link de referencia')}
        <TextInput
          value={referenceUrl}
          onChangeText={setReferenceUrl}
          placeholder="https://youtube.com/..."
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />
      </View>

      {/* Guardar */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          backgroundColor: pc('systemOrange'),
          padding: 16,
          borderRadius: 12,
          borderCurve: 'continuous' as const,
          alignItems: 'center',
          opacity: pressed || saving ? 0.7 : 1,
        })}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            {isEdit ? 'Guardar cambios' : 'Guardar receta'}
          </Text>
        )}
      </Pressable>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? (parentId ? 'Editar Variación' : 'Editar Receta') : (parentId ? 'Nueva Variación' : 'Nueva Receta') }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          isWeb
            ? { padding: 24, alignItems: 'center', paddingBottom: 64 }
            : { padding: 16, gap: 24, paddingBottom: 48 }
        }
      >
        {isWeb ? (
          /* ── Web: tarjeta centrada ── */
          <View
            style={{
              width: '100%',
              maxWidth: 680,
              gap: 24,
              backgroundColor: pc('secondarySystemBackground'),
              borderRadius: 20,
              borderCurve: 'continuous' as const,
              padding: 24,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            } as any}
          >
            {/* Foto + Nombre + Dificultad en fila */}
            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
              <View>
                {sectionLabel('Foto')}
                {photoPickerWeb}
              </View>
              <View style={{ flex: 1, gap: 16 }}>
                <View>
                  {sectionLabel('Nombre')}
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre de la receta"
                    style={inputStyle}
                  />
                </View>
                <View>
                  {sectionLabel('Descripción para el menú')}
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Breve descripción para el menú..."
                    multiline
                    maxLength={200}
                    style={[inputStyle, { minHeight: 64 }]}
                  />
                </View>
                <View>
                  {sectionLabel('Dificultad')}
                  {difficultySelector}
                </View>
              </View>
            </View>

            {parentSelector}

            {sharedSections}
          </View>
        ) : (
          /* ── Mobile: layout original ── */
          <>
            <View>
              {sectionLabel('Nombre')}
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre de la receta"
                style={inputStyle}
              />
            </View>

            <View>
              {sectionLabel('Descripción para el menú')}
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Breve descripción para el menú..."
                multiline
                maxLength={200}
                style={[inputStyle, { minHeight: 64 }]}
              />
            </View>

            <View>
              {sectionLabel('Foto')}
              {photoUri ? (
                <View style={{ borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' }}>
                  <Pressable onPress={pickPhoto}>
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: '100%', height: 200 }}
                      contentFit="cover"
                    />
                  </Pressable>
                  <Pressable
                    onPress={removePhoto}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      borderRadius: 14,
                      width: 28,
                      height: 28,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <IconSymbol name="xmark" size={13} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickPhoto}>
                  <View
                    style={{
                      height: 120,
                      backgroundColor: pc('secondarySystemBackground'),
                      borderRadius: 12,
                      borderCurve: 'continuous' as const,
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: pc('systemOrange'), fontSize: 15, fontWeight: '500' }}>
                      Toca para agregar foto
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            <View>
              {sectionLabel('Dificultad')}
              {difficultySelector}
            </View>

            {parentSelector}

            {sharedSections}
          </>
        )}
      </ScrollView>

      {/* Picker de receta base */}
      {showParentPicker && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            padding: 20,
          }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setShowParentPicker(false)}
          />
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: 420,
              backgroundColor: pc('systemBackground'),
              borderRadius: 20,
              borderCurve: 'continuous' as const,
              overflow: 'hidden',
              ...(isWeb
                ? { boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }
                : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }),
            } as any}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: pc('separator'),
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: pc('label') }}>
                Receta base
              </Text>
              <Pressable onPress={() => setShowParentPicker(false)} hitSlop={8}>
                <IconSymbol name="xmark.circle.fill" size={24} color={pc('systemGray3')} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 10, gap: 6 }}>
              <Pressable
                onPress={() => { setParentId(null); setShowParentPicker(false); }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous' as const,
                  backgroundColor: !parentId ? '#FF950018' : pc('secondarySystemBackground'),
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ flex: 1, fontSize: 15, color: !parentId ? '#FF9500' : pc('secondaryLabel'), fontStyle: 'italic' }}>
                  Ninguna (receta independiente)
                </Text>
                {!parentId && <IconSymbol name="checkmark" size={16} color="#FF9500" />}
              </Pressable>
              {baseRecipesForParent.map((r) => {
                const isSelected = parentId === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => { setParentId(r.id); setShowParentPicker(false); }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderCurve: 'continuous' as const,
                      backgroundColor: isSelected ? '#FF950018' : pc('secondarySystemBackground'),
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: isSelected ? '#FF9500' : pc('label'), fontWeight: isSelected ? '600' : '400' }}>
                      {r.name}
                    </Text>
                    {isSelected && <IconSymbol name="checkmark" size={16} color="#FF9500" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}
