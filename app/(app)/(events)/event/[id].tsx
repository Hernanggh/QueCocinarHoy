import { pc } from '@/lib/colors';
import { useState } from 'react';
import { View, Pressable, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { generateAndShareEventPDF } from '@/lib/event-pdf';
import { supabase } from '@/lib/supabase';
import { useEvents } from '@/hooks/use-events';
import { ShoppingListSheet } from '@/components/shopping-list-sheet';
import { LoadingScreen } from '@/components/loading-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EventDetailContent } from '@/components/event-detail-content';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { events, loading } = useEvents();
  const [sheetVisible, setSheetVisible] = useState(false);

  const event = events.find((e) => e.id === id);

  const handleDelete = () => {
    Alert.alert('Eliminar evento', `¿Eliminar "${event?.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('event_recipes').delete().eq('event_id', id);
          await supabase.from('events').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!event) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          title: event.name,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/event/new' as any,
                    params: { eventId: id },
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
        <EventDetailContent
          event={event}
          onEdit={() =>
            router.push({ pathname: '/event/new' as any, params: { eventId: id } })
          }
          onDelete={handleDelete}
          onRecipePress={(recipeId) => router.push(`/recipe/${recipeId}` as any)}
          onShoppingList={() => setSheetVisible(true)}
          onSharePDF={() => generateAndShareEventPDF(event)}
        />
      </ScrollView>

      <ShoppingListSheet
        event={event}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}
