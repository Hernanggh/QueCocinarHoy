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
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';
import { useEvents } from '@/hooks/use-events';
import { useRecipes } from '@/hooks/use-recipes';

export default function EventFormScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const isEdit = Boolean(eventId);
  const { user } = useAuth();
  const { events } = useEvents();
  const { recipes } = useRecipes();

  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [guestCount, setGuestCount] = useState('4');
  const [notes, setNotes] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !eventId) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    setName(event.name);
    setEventDate(new Date(event.event_date + 'T12:00:00'));
    setGuestCount(String(event.guest_count));
    setNotes(event.notes ?? '');
    setSelectedRecipeIds(event.recipes.map((r) => r.id));
  }, [isEdit, eventId, events]);

  const toggleRecipe = (id: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Agrega un nombre al evento');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const eventData = {
        user_id: user.id,
        name: name.trim(),
        event_date: eventDate.toISOString().split('T')[0],
        guest_count: parseInt(guestCount) || 4,
        notes: notes.trim() || null,
      };

      let finalEventId = eventId ?? '';

      if (isEdit && eventId) {
        await supabase.from('events').update(eventData).eq('id', eventId);
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select('id')
          .single();
        if (error) throw error;
        finalEventId = data.id;
      }

      await supabase.from('event_recipes').delete().eq('event_id', finalEventId);
      if (selectedRecipeIds.length > 0) {
        await supabase.from('event_recipes').insert(
          selectedRecipeIds.map((recipe_id) => ({ event_id: finalEventId, recipe_id }))
        );
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar el evento');
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
    backgroundColor: pc('secondarySystemBackground'),
    padding: 14,
    borderRadius: 10,
    borderCurve: 'continuous' as const,
    fontSize: 16,
    color: pc('label'),
  };

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Editar Evento' : 'Nuevo Evento' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 48 }}
      >
        {/* Nombre */}
        <View>
          {sectionLabel('Nombre del evento')}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Cena del sábado con amigos"
            style={inputStyle}
          />
        </View>

        {/* Fecha y personas */}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ flex: 2 }}>
            {sectionLabel('Fecha')}
            <View
              style={[
                inputStyle,
                { justifyContent: 'center', minHeight: 50 },
              ]}
            >
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={eventDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value)
                      setEventDate(new Date(e.target.value + 'T12:00:00'));
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 16,
                    color: 'inherit',
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="compact"
                  onChange={(_, date) => {
                    if (date) setEventDate(date);
                  }}
                />
              )}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            {sectionLabel('Personas')}
            <TextInput
              value={guestCount}
              onChangeText={setGuestCount}
              keyboardType="number-pad"
              placeholder="4"
              style={inputStyle}
            />
          </View>
        </View>

        {/* Notas */}
        <View>
          {sectionLabel('Notas')}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Detalles del evento..."
            multiline
            style={[inputStyle, { minHeight: 70 }]}
          />
        </View>

        {/* Selector de recetas */}
        <View>
          {sectionLabel(`Recetas (${selectedRecipeIds.length} seleccionadas)`)}
          <View style={{ gap: 8 }}>
            {recipes.map((recipe) => {
              const selected = selectedRecipeIds.includes(recipe.id);
              return (
                <Pressable
                  key={recipe.id}
                  onPress={() => toggleRecipe(recipe.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    borderCurve: 'continuous',
                    backgroundColor: selected
                      ? pc('systemOrange') + '18'
                      : pc('secondarySystemBackground'),
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
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 15, color: pc('label'), fontWeight: '500' }}>
                      {recipe.name}
                    </Text>
                    {recipe.categories.length > 0 && (
                      <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                        {recipe.categories.map((c) => c.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
            {recipes.length === 0 && (
              <Text style={{ fontSize: 15, color: pc('secondaryLabel'), textAlign: 'center', padding: 16 }}>
                Aún no tienes recetas. Agrégalas en la pestaña Recetas.
              </Text>
            )}
          </View>
        </View>

        {/* Guardar */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor: pc('systemOrange'),
            padding: 16,
            borderRadius: 12,
            borderCurve: 'continuous',
            alignItems: 'center',
            opacity: pressed || saving ? 0.7 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              {isEdit ? 'Guardar cambios' : 'Crear evento'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}
