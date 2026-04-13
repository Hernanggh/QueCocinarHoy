import { pc } from '@/lib/colors';
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useEvents } from '@/hooks/use-events';
import { ShoppingListSheet } from '@/components/shopping-list-sheet';
import { LoadingScreen } from '@/components/loading-screen';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}
      >
        {/* Info del evento */}
        <View
          style={{
            backgroundColor: pc('secondarySystemBackground'),
            borderRadius: 16,
            borderCurve: 'continuous',
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconSymbol name="calendar" size={18} color={pc('systemOrange')} />
            <Text style={{ fontSize: 15, color: pc('label'), flex: 1 }}>
              {formatDate(event.event_date)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconSymbol name="person.2.fill" size={18} color={pc('systemOrange')} />
            <Text style={{ fontSize: 15, color: pc('label') }}>
              {event.guest_count} {event.guest_count === 1 ? 'persona' : 'personas'}
            </Text>
          </View>
          {event.notes && (
            <Text selectable style={{ fontSize: 15, color: pc('secondaryLabel'), lineHeight: 22 }}>
              {event.notes}
            </Text>
          )}
        </View>

        {/* Recetas del evento */}
        {event.recipes.length > 0 ? (
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: pc('label'),
                marginBottom: 12,
              }}
            >
              Menú ({event.recipes.length})
            </Text>
            <View style={{ gap: 10 }}>
              {event.recipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onPress={() =>
                    router.push(`/recipe/${recipe.id}` as any)
                  }
                  style={({ pressed }) => ({
                    backgroundColor: pc('secondarySystemBackground'),
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    padding: 14,
                    gap: 6,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      style={{ fontSize: 16, fontWeight: '600', color: pc('label'), flex: 1 }}
                      numberOfLines={1}
                    >
                      {recipe.name}
                    </Text>
                    <IconSymbol name="chevron.right" size={16} color={pc('systemGray3')} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <DifficultyBadge difficulty={recipe.difficulty} />
                    {recipe.categories.length > 0 && (
                      <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                        {recipe.categories.map((c) => c.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                    {recipe.ingredients.length} ingredientes · {recipe.base_servings} porciones base
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View
            style={{
              padding: 24,
              alignItems: 'center',
              gap: 8,
              backgroundColor: pc('secondarySystemBackground'),
              borderRadius: 16,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ fontSize: 15, color: pc('secondaryLabel'), textAlign: 'center' }}>
              No hay recetas en este evento. Edítalo para agregar recetas.
            </Text>
          </View>
        )}

        {/* Botón lista del súper */}
        <Pressable
          onPress={() => setSheetVisible(true)}
          style={({ pressed }) => ({
            backgroundColor: pc('systemOrange'),
            padding: 16,
            borderRadius: 14,
            borderCurve: 'continuous',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <IconSymbol name="cart" size={22} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            Lista del súper
          </Text>
        </Pressable>
      </ScrollView>

      <ShoppingListSheet
        event={event}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}
