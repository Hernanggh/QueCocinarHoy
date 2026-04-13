import { pc } from '@/lib/colors';
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRecipes } from '@/hooks/use-recipes';
import { useLookupData } from '@/hooks/use-lookup-data';
import { deletePhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { RecipeCard } from '@/components/recipe-card';
import { RecipeDetailContent } from '@/components/recipe-detail-content';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';

const isWeb = Platform.OS === 'web';

function SidebarSection({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const allItems: { id: number | null; name: string }[] = [{ id: null, name: 'Todas' }, ...items];
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: pc('secondaryLabel'),
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          paddingHorizontal: 16,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {allItems.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id ?? 'all'}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: selected ? '#FF950018' : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {selected && (
              <View
                style={{
                  width: 3,
                  height: 18,
                  backgroundColor: '#FF9500',
                  borderRadius: 2,
                  marginRight: 10,
                }}
              />
            )}
            <Text
              style={{
                fontSize: 15,
                color: selected ? '#FF9500' : pc('label'),
                fontWeight: selected ? '600' : '400',
                marginLeft: selected ? 0 : 13,
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, loading, fetchError, refetch } = useRecipes();
  const { categories, methods } = useLookupData();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  // Refetch cuando la pantalla vuelve al foco (ej. al regresar tras eliminar)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const selectedRecipe = selectedRecipeId
    ? recipes.find((r) => r.id === selectedRecipeId) ?? null
    : null;

  const handleWebDelete = (recipeId: string, photoUrl: string | null) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    Alert.alert(
      'Eliminar receta',
      `¿Eliminar "${recipe?.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (photoUrl) await deletePhoto(photoUrl);
            await supabase.from('recipes').delete().eq('id', recipeId);
            setSelectedRecipeId(null);
            refetch();
          },
        },
      ]
    );
  };

  const showSidebar = Platform.OS === 'web' && width >= 700;
  const sidebarTopPad = Platform.OS === 'web' ? 120 : 20;
  const gridWidth = showSidebar ? width - 220 : width;
  const cardWidth = (gridWidth - 32 - 12) / 2; // 32 = padding horizontal (16×2), 12 = gap entre columnas
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedMethod ? 1 : 0);
  const activeLabel = [
    selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : null,
    selectedMethod ? methods.find((m) => m.id === selectedMethod)?.name : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const filtered = recipes.filter((r) => {
    const passCategory =
      !selectedCategory || r.categories.some((c) => c.id === selectedCategory);
    const passMethod =
      !selectedMethod || r.methods.some((m) => m.id === selectedMethod);
    return passCategory && passMethod;
  });

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/recipe/new' as any)}
              hitSlop={8}
            >
              <IconSymbol name="plus" size={24} color={pc('systemOrange')} />
            </Pressable>
          ),
        }}
      />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Sidebar (solo en web ancho) */}
        {showSidebar && (
          <View
            style={{
              width: 220,
              borderRightWidth: 0.5,
              borderRightColor: pc('separator'),
              backgroundColor: pc('systemBackground'),
            }}
          >
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingTop: sidebarTopPad, paddingBottom: 32 }}
            >
              <SidebarSection
                title="Categorías"
                items={categories}
                selectedId={selectedCategory}
                onSelect={setSelectedCategory}
              />
              {methods.length > 0 && (
                <SidebarSection
                  title="Método"
                  items={methods}
                  selectedId={selectedMethod}
                  onSelect={setSelectedMethod}
                />
              )}
            </ScrollView>
          </View>
        )}

        {/* Lista de recetas */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          key="grid"
          columnWrapperStyle={{ gap: 12 }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          style={{ flex: 1 }}
          ListHeaderComponent={
            !showSidebar ? (
              <View style={{ marginBottom: 8 }}>
                <Pressable
                  onPress={() => setFilterOpen((v) => !v)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 4,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <IconSymbol
                    name="line.3.horizontal.decrease"
                    size={18}
                    color={pc('systemOrange')}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: activeFilterCount ? pc('systemOrange') : pc('secondaryLabel'),
                      fontWeight: activeFilterCount ? '600' : '400',
                    }}
                  >
                    {activeLabel || 'Filtrar'}
                  </Text>
                  {activeFilterCount > 0 && (
                    <View
                      style={{
                        backgroundColor: pc('systemOrange'),
                        borderRadius: 10,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        {activeFilterCount}
                      </Text>
                    </View>
                  )}
                  <IconSymbol
                    name={filterOpen ? 'chevron.up' : 'chevron.down'}
                    size={14}
                    color={pc('secondaryLabel')}
                  />
                </Pressable>

                {filterOpen && (
                  <View
                    style={{
                      backgroundColor: pc('secondarySystemBackground'),
                      borderRadius: 14,
                      borderCurve: 'continuous',
                      paddingVertical: 12,
                      marginBottom: 4,
                    }}
                  >
                    <SidebarSection
                      title="Categorías"
                      items={categories}
                      selectedId={selectedCategory}
                      onSelect={setSelectedCategory}
                    />
                    {methods.length > 0 && (
                      <SidebarSection
                        title="Método"
                        items={methods}
                        selectedId={selectedMethod}
                        onSelect={setSelectedMethod}
                      />
                    )}
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            fetchError ? (
              <View style={{ padding: 24, gap: 8 }}>
                <Text style={{ color: pc('systemRed'), fontSize: 15, fontWeight: '600' }}>
                  Error al cargar recetas
                </Text>
                <Text style={{ color: pc('secondaryLabel'), fontSize: 13, fontFamily: 'monospace' }}>
                  {fetchError}
                </Text>
              </View>
            ) : (
              <EmptyState
                icon="fork.knife"
                title="Sin recetas aún"
                subtitle="Toca el + para agregar tu primera receta"
              />
            )
          }
          renderItem={({ item, index }) => (
            <Animated.View
              style={{ width: cardWidth }}
              entering={FadeInUp.duration(400).delay(index * 60)}
            >
              <Pressable
                onPress={() =>
                  isWeb
                    ? setSelectedRecipeId(item.id)
                    : router.push(`/recipe/${item.id}` as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <RecipeCard recipe={item} />
              </Pressable>
            </Animated.View>
          )}
        />
      </View>

      {/* Modal de detalle en web */}
      {isWeb && selectedRecipe && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 200,
          }}
        >
          {/* Backdrop */}
          <Pressable
            onPress={() => setSelectedRecipeId(null)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
          />

          {/* Tarjeta */}
          <View
            style={{
              width: '92%',
              maxWidth: 720,
              maxHeight: '88%',
              backgroundColor: pc('systemBackground'),
              borderRadius: 20,
              borderCurve: 'continuous',
              overflow: 'hidden',
              zIndex: 1,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            } as any}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: pc('separator'),
                gap: 12,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: '700',
                  color: pc('label'),
                }}
                numberOfLines={1}
              >
                {selectedRecipe.name}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedRecipeId(null);
                  router.push({
                    pathname: '/recipe/new' as any,
                    params: { recipeId: selectedRecipe.id },
                  });
                }}
                hitSlop={8}
              >
                <IconSymbol name="pencil" size={20} color={pc('systemOrange')} />
              </Pressable>
              <Pressable
                onPress={() =>
                  handleWebDelete(selectedRecipe.id, selectedRecipe.photo_url)
                }
                hitSlop={8}
              >
                <IconSymbol name="trash" size={20} color={pc('systemRed')} />
              </Pressable>
              <Pressable onPress={() => setSelectedRecipeId(null)} hitSlop={8}>
                <IconSymbol name="xmark" size={20} color={pc('secondaryLabel')} />
              </Pressable>
            </View>

            {/* Contenido scrollable */}
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              <RecipeDetailContent
                recipe={selectedRecipe}
                onEdit={() => {
                  setSelectedRecipeId(null);
                  router.push({
                    pathname: '/recipe/new' as any,
                    params: { recipeId: selectedRecipe.id },
                  });
                }}
                onDelete={() =>
                  handleWebDelete(selectedRecipe.id, selectedRecipe.photo_url)
                }
                onSaucePress={(id) => setSelectedRecipeId(id)}
              />
            </ScrollView>
          </View>
        </View>
      )}
    </>
  );
}
