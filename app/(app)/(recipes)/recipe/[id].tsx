import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { pc } from '@/lib/colors';
import { useRecipes } from '@/hooks/use-recipes';
import { deletePhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/loading-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RecipeDetailContent } from '@/components/recipe-detail-content';
import { AddToEventSheet } from '@/components/add-to-event-sheet';
import type { Recipe } from '@/types/app';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipes, loading } = useRecipes();
  const [addToEventRecipe, setAddToEventRecipe] = useState<Recipe | null>(null);

  const recipe = recipes.find((r) => r.id === id);

  const handleDelete = () => {
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe?.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          if (recipe?.photo_url) await deletePhoto(recipe.photo_url);
          await supabase.from('recipes').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!recipe) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/recipe/new' as any,
                    params: { recipeId: id },
                  })
                }
                hitSlop={8}
              >
                <IconSymbol name="pencil" size={22} color={pc('systemOrange')} />
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={8}>
                <IconSymbol name="trash" size={22} color={pc('systemRed')} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <RecipeDetailContent
          recipe={recipe}
          onEdit={() =>
            router.push({
              pathname: '/recipe/new' as any,
              params: { recipeId: id },
            })
          }
          onDelete={handleDelete}
          onSaucePress={(sauceId) => router.push(`/recipe/${sauceId}` as any)}
          onAddToEvent={() => setAddToEventRecipe(recipe)}
        />
      </ScrollView>

      {/* Overlay selector de evento */}
      {addToEventRecipe && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 10,
            padding: 20,
          }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setAddToEventRecipe(null)}
          />
          <AddToEventSheet
            recipe={addToEventRecipe}
            onClose={() => setAddToEventRecipe(null)}
            onSelect={() => {
              setAddToEventRecipe(null);
              router.back();
            }}
          />
        </View>
      )}
    </>
  );
}
