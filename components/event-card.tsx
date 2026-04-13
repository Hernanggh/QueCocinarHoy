import { pc } from '@/lib/colors';
import { View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Event } from '@/types/app';

export function EventCard({ event }: { event: Event }) {
  const date = new Date(event.event_date + 'T12:00:00');
  const day = date.getDate();
  const month = date
    .toLocaleDateString('es-MX', { month: 'short' })
    .toUpperCase()
    .replace('.', '');

  return (
    <View
      style={{
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: pc('secondarySystemBackground'),
        flexDirection: 'row',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Bloque de fecha */}
      <View
        style={{
          backgroundColor: '#FF9500',
          width: 72,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 0,
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 34,
            fontWeight: '800',
            lineHeight: 38,
          }}
        >
          {day}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        >
          {month}
        </Text>
      </View>

      {/* Contenido */}
      <View style={{ flex: 1, padding: 14, justifyContent: 'center', gap: 6 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: pc('label'),
            lineHeight: 22,
          }}
          numberOfLines={2}
        >
          {event.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconSymbol name="person.2.fill" size={13} color={pc('secondaryLabel')} />
            <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
              {event.guest_count} {event.guest_count === 1 ? 'persona' : 'personas'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconSymbol name="fork.knife" size={13} color={pc('secondaryLabel')} />
            <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
              {event.recipes.length}{' '}
              {event.recipes.length === 1 ? 'receta' : 'recetas'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ justifyContent: 'center', paddingRight: 14 }}>
        <IconSymbol name="chevron.right" size={16} color={pc('systemGray3')} />
      </View>
    </View>
  );
}
