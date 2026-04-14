import { pc } from '@/lib/colors';
import { useState, useEffect } from 'react';
import { View, Text, Pressable, FlatList, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Recipe } from '@/types/app';

type LightEvent = { id: string; name: string; event_date: string };

type Props = {
  recipe: Recipe;
  onClose: () => void;
  onSelect: () => void;
};

export function AddToEventSheet({ recipe, onClose, onSelect }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<LightEvent[]>([]);
  const [eventIdsWithRecipe, setEventIdsWithRecipe] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    Promise.all([
      supabase
        .from('events')
        .select('id, name, event_date')
        .eq('user_id', user.id)
        .order('event_date', { ascending: false }),
      supabase
        .from('event_recipes')
        .select('event_id')
        .eq('recipe_id', recipe.id),
    ]).then(([eventsRes, linkRes]) => {
      if (eventsRes.data) setEvents(eventsRes.data);
      if (linkRes.data) {
        setEventIdsWithRecipe(new Set(linkRes.data.map((r) => r.event_id)));
      }
      setLoading(false);
    });
  }, [recipe.id, user]);

  const handleSelect = async (eventId: string) => {
    const hasIt = eventIdsWithRecipe.has(eventId);
    if (hasIt) {
      await supabase
        .from('event_recipes')
        .delete()
        .eq('event_id', eventId)
        .eq('recipe_id', recipe.id);
    } else {
      await supabase
        .from('event_recipes')
        .insert({ event_id: eventId, recipe_id: recipe.id, variation_id: selectedVariationId });
    }
    onSelect();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 440,
        maxHeight: 520,
        backgroundColor: pc('systemBackground'),
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }
          : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }),
      } as any}
    >
      {/* Header */}
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
          Agregar a evento
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <IconSymbol name="xmark.circle.fill" size={24} color={pc('systemGray3')} />
        </Pressable>
      </View>

      {/* Selector de variación (solo si la receta tiene variaciones) */}
      {recipe.variations.length > 0 && (
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: pc('separator'), padding: 10, gap: 6 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: pc('secondaryLabel'),
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              paddingHorizontal: 4,
              marginBottom: 2,
            }}
          >
            Variación
          </Text>
          {[{ id: null as string | null, name: 'Base (sin variación)' }, ...recipe.variations].map((v) => {
            const isSelected = selectedVariationId === v.id;
            return (
              <Pressable
                key={v.id ?? 'base'}
                onPress={() => setSelectedVariationId(v.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: isSelected ? '#FF950012' : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: isSelected ? '#FF9500' : pc('systemGray3'),
                    backgroundColor: isSelected ? '#FF9500' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isSelected && (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: isSelected ? '#FF9500' : pc('label'),
                    fontWeight: isSelected ? '600' : '400',
                  }}
                >
                  {v.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {loading ? (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{ color: pc('secondaryLabel') }}>Cargando eventos…</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={{ padding: 32, alignItems: 'center', gap: 10 }}>
          <IconSymbol name="calendar" size={40} color={pc('systemGray3')} />
          <Text style={{ fontSize: 15, color: pc('secondaryLabel') }}>
            No tienes eventos creados
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10, gap: 6 }}
          renderItem={({ item }) => {
            const selected = eventIdsWithRecipe.has(item.id);
            return (
              <Pressable
                onPress={() => handleSelect(item.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  backgroundColor: selected ? '#FF950018' : pc('secondarySystemBackground'),
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: selected ? '#FF9500' : pc('label'),
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: pc('secondaryLabel') }}>
                    {formatDate(item.event_date)}
                  </Text>
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selected ? '#FF9500' : pc('systemGray3'),
                    backgroundColor: selected ? '#FF9500' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {selected && <IconSymbol name="checkmark" size={12} color="#fff" />}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
