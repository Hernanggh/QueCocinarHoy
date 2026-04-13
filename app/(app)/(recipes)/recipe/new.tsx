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
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useLookupData } from '@/hooks/use-lookup-data';
import { useRecipes } from '@/hooks/use-recipes';
import { uploadPhoto, getPublicUrl } from '@/lib/storage';
import { IngredientRow, type IngredientDraft } from '@/components/ingredient-row';
import { StepRow, type StepDraft } from '@/components/step-row';
import { DifficultyColors, DifficultyLabels } from '@/constants/theme';
import type { DifficultyLevel } from '@/types/app';

let idCounter = 0;
const uid = () => `local_${++idCounter}_${Date.now()}`;

const isWeb = Platform.OS === 'web';

export default function RecipeFormScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
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
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    setName(recipe.name);
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
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
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
          const response = await fetch(photoUri);
          const blob = await response.blob();
          const path = await uploadPhoto(user.id, finalRecipeId, blob);
          if (path) {
            await supabase.from('recipes').update({ photo_url: path }).eq('id', finalRecipeId);
          } else {
            console.warn('[recipe/new] photo upload returned null — saved recipe without photo');
          }
        } catch (photoErr: any) {
          console.warn('[recipe/new] photo upload exception:', photoErr.message);
          // La receta se guarda aunque la foto falle
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
    <Pressable onPress={pickPhoto}>
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
          <Image
            source={{ uri: photoUri }}
            style={{ width: 160, height: 160 }}
            contentFit="cover"
          />
        </View>
      ) : (
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
      )}
    </Pressable>
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
        {sectionLabel('Ingredientes')}
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
      <Stack.Screen options={{ title: isEdit ? 'Editar Receta' : 'Nueva Receta' }} />
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
              <Pressable onPress={pickPhoto}>
                {photoUri ? (
                  <View style={{ borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' }}>
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: '100%', height: 200 }}
                      contentFit="cover"
                    />
                  </View>
                ) : (
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
                )}
              </Pressable>
            </View>

            <View>
              {sectionLabel('Dificultad')}
              {difficultySelector}
            </View>

            {sharedSections}
          </>
        )}
      </ScrollView>
    </>
  );
}
