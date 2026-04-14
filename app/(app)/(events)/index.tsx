import { pc } from '@/lib/colors';
import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { generateAndShareEventPDF } from '@/lib/event-pdf';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useEvents } from '@/hooks/use-events';
import { EventCard } from '@/components/event-card';
import { EventDetailContent } from '@/components/event-detail-content';
import { ShoppingListSheet } from '@/components/shopping-list-sheet';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';

const isWeb = Platform.OS === 'web';

export default function EventsScreen() {
  const router = useRouter();
  const { events, loading, refetch, removeEvent } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Refetch cuando la pantalla vuelve al foco (ej. al regresar tras eliminar)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const selectedEvent = selectedEventId
    ? events.find((e) => e.id === selectedEventId) ?? null
    : null;

  const handleWebDelete = async (eventId: string, eventName: string) => {
    if (!(window as any).confirm(`¿Eliminar "${eventName}"? Esta acción no se puede deshacer.`)) return;
    removeEvent(eventId);
    setSelectedEventId(null);
    try {
      await supabase.from('event_recipes').delete().eq('event_id', eventId);
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    } catch (e: any) {
      console.error('[handleWebDelete]', e);
      refetch();
    }
  };

  const handleRemoveRecipe = async (recipeId: string, eventId: string) => {
    await supabase.from('event_recipes').delete().eq('event_id', eventId).eq('recipe_id', recipeId);
    refetch();
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/event/new' as any)}
              hitSlop={8}
            >
              <IconSymbol name="plus" size={24} color={pc('systemOrange')} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="Sin eventos aún"
            subtitle="Toca el + para planear tu primera cena"
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index * 60)}>
            <Pressable
              onPress={() =>
                isWeb
                  ? setSelectedEventId(item.id)
                  : router.push(`/event/${item.id}` as any)
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <EventCard event={item} />
            </Pressable>
          </Animated.View>
        )}
      />

      {/* Modal de detalle en web */}
      {isWeb && selectedEvent && (
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
            onPress={() => setSelectedEventId(null)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
            }}
          />

          {/* Tarjeta — Pressable con onPress vacío actúa como barrera de eventos (evita bubbling al backdrop) */}
          <Pressable
            onPress={() => {}}
            style={{
              width: '92%',
              maxWidth: 680,
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
                {selectedEvent.name}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedEventId(null);
                  router.push({
                    pathname: '/event/new' as any,
                    params: { eventId: selectedEvent.id },
                  });
                }}
                hitSlop={8}
              >
                <IconSymbol name="pencil" size={20} color={pc('systemOrange')} />
              </Pressable>
              <Pressable
                onPress={() => handleWebDelete(selectedEvent.id, selectedEvent.name)}
                hitSlop={8}
              >
                <IconSymbol name="trash" size={20} color={pc('systemRed')} />
              </Pressable>
              <Pressable onPress={() => setSelectedEventId(null)} hitSlop={8}>
                <IconSymbol name="xmark" size={20} color={pc('secondaryLabel')} />
              </Pressable>
            </View>

            {/* Contenido scrollable */}
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              <EventDetailContent
                event={selectedEvent}
                onEdit={() => {
                  setSelectedEventId(null);
                  router.push({
                    pathname: '/event/new' as any,
                    params: { eventId: selectedEvent.id },
                  });
                }}
                onDelete={() => handleWebDelete(selectedEvent.id, selectedEvent.name)}
                onRecipePress={(recipeId) => {
                  setSelectedEventId(null);
                  router.push(`/recipe/${recipeId}` as any);
                }}
                onRemoveRecipe={(recipeId) => handleRemoveRecipe(recipeId, selectedEvent.id)}
                onShoppingList={() => setSheetVisible(true)}
                onSharePDF={() => generateAndShareEventPDF(selectedEvent)}
              />
            </ScrollView>
          </Pressable>
        </View>
      )}

      {/* ShoppingListSheet — funciona tanto en mobile como en el modal web */}
      {selectedEvent && (
        <ShoppingListSheet
          event={selectedEvent}
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
        />
      )}
    </>
  );
}
