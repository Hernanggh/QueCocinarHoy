import { pc } from '@/lib/colors';
import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
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
import { OfflineBanner } from '@/components/offline-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Event } from '@/types/app';

const isWeb = Platform.OS === 'web';

type Period = 'all' | 'upcoming' | 'past';

const PERIOD_OPTIONS: { id: Period; name: string }[] = [
  { id: 'all', name: 'Todos' },
  { id: 'upcoming', name: 'Próximos' },
  { id: 'past', name: 'Anteriores' },
];

function filterEvents(events: Event[], period: Period): Event[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = events.filter((e) => {
    const d = new Date(e.event_date + 'T12:00:00');
    if (period === 'upcoming') return d >= today;
    if (period === 'past') return d < today;
    return true;
  });

  // Próximos: más cercano primero; Anteriores y Todos: más reciente primero
  return period === 'upcoming' ? [...filtered].reverse() : filtered;
}

export default function EventsScreen() {
  const router = useRouter();
  const { events, loading, isOffline, refetch, removeEvent } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const { width } = useWindowDimensions();

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

  const showSidebar = Platform.OS === 'web' && width >= 700;
  const sidebarTopPad = Platform.OS === 'web' ? 120 : 20;
  const gridWidth = showSidebar ? width - 220 : width;
  const numCols = Platform.OS === 'web' ? 3 : 2;
  const gapTotal = 12 * (numCols - 1);
  const cardWidth = (gridWidth - 32 - gapTotal) / numCols;

  const filtered = filterEvents(events, period);

  const periodLabel = period === 'all' ? null : PERIOD_OPTIONS.find((p) => p.id === period)?.name;

  // Sidebar section component (inline)
  const sidebarSection = (
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
        Filtro
      </Text>
      {PERIOD_OPTIONS.map((opt) => {
        const selected = period === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => setPeriod(opt.id)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 9,
              backgroundColor: selected ? '#FF950018' : 'transparent',
              opacity: pressed ? 0.7 : 1,
              cursor: 'pointer',
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
              {opt.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: !isWeb ? () => (
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../../assets/images/icon.png')}
              style={{ width: 30, height: 30, borderRadius: 7 }}
            />
          ) : undefined,
        }}
      />
      {isOffline && <OfflineBanner />}
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
              style={{ flex: 1 }}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingTop: sidebarTopPad, paddingBottom: 16 }}
            >
              <View style={{ marginBottom: 16 }}>
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
                  Eventos
                </Text>
                <Pressable
                  onPress={() => router.push('/event/new' as any)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                    cursor: 'pointer',
                  })}
                >
                  <IconSymbol name="plus.circle.fill" size={18} color={pc('systemOrange')} />
                  <Text style={{ fontSize: 15, color: pc('systemOrange'), fontWeight: '600' }}>
                    Nuevo evento
                  </Text>
                </Pressable>
              </View>
              {sidebarSection}
            </ScrollView>
          </View>
        )}

        {/* Grid de eventos */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={numCols}
          key={`grid-${numCols}`}
          columnWrapperStyle={{ gap: 12 }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingTop: isWeb ? 80 : 16, gap: 12, paddingBottom: 32 }}
          style={{ flex: 1 }}
          ListHeaderComponent={
            !showSidebar ? (
              <View style={{ marginBottom: 8 }}>
                {/* Botón Nuevo evento — solo móvil */}
                <Pressable
                  onPress={() => router.push('/event/new' as any)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: pc('systemOrange'),
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    paddingVertical: 13,
                    marginBottom: 12,
                    opacity: pressed ? 0.85 : 1,
                    cursor: 'pointer',
                  })}
                >
                  <IconSymbol name="plus" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    Nuevo evento
                  </Text>
                </Pressable>

                {/* Filtro colapsable */}
                <Pressable
                  onPress={() => setFilterOpen((v) => !v)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 4,
                    paddingVertical: 10,
                    opacity: pressed ? 0.7 : 1,
                    cursor: 'pointer',
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
                      color: period !== 'all' ? pc('systemOrange') : pc('secondaryLabel'),
                      fontWeight: period !== 'all' ? '600' : '400',
                    }}
                  >
                    {periodLabel ?? 'Filtrar'}
                  </Text>
                  {period !== 'all' && (
                    <View
                      style={{
                        backgroundColor: pc('systemOrange'),
                        borderRadius: 10,
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>1</Text>
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
                    {sidebarSection}
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title={period === 'upcoming' ? 'Sin eventos próximos' : period === 'past' ? 'Sin eventos anteriores' : 'Sin eventos aún'}
              subtitle={period === 'all' ? 'Toca el + para planear tu primera cena' : 'Cambia el filtro para ver otros eventos'}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              style={{ width: cardWidth }}
              entering={FadeInUp.duration(400).delay(index * 60)}
            >
              <Pressable
                onPress={() =>
                  isWeb
                    ? setSelectedEventId(item.id)
                    : router.push(`/event/${item.id}` as any)
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <EventCard event={item} photoHeight={cardWidth} />
              </Pressable>
            </Animated.View>
          )}
        />
      </View>

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
                style={{ flex: 1, fontSize: 18, fontWeight: '700', color: pc('label') }}
                numberOfLines={1}
              >
                {selectedEvent.name}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedEventId(null);
                  router.push({ pathname: '/event/new' as any, params: { eventId: selectedEvent.id } });
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

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              <EventDetailContent
                event={selectedEvent}
                onEdit={() => {
                  setSelectedEventId(null);
                  router.push({ pathname: '/event/new' as any, params: { eventId: selectedEvent.id } });
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
