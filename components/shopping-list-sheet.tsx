import { pc } from '@/lib/colors';
import { useState } from 'react';
import { View, Text, Modal, Pressable, FlatList, Share } from 'react-native';
import { buildShoppingList } from '@/lib/shopping';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Event } from '@/types/app';

type ShoppingListSheetProps = {
  event: Event;
  visible: boolean;
  onClose: () => void;
};

export function ShoppingListSheet({ event, visible, onClose }: ShoppingListSheetProps) {
  const [guestCount, setGuestCount] = useState(event.guest_count);
  const items = buildShoppingList(event, guestCount);

  const handleShare = async () => {
    const header = `Lista del súper — ${event.name} (${guestCount} personas)\n\n`;
    const body = items
      .map((item) => `• ${item.quantity} ${item.unit} de ${item.name}`)
      .join('\n');
    await Share.share({ message: header + body });
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <View style={{ flex: 1, backgroundColor: pc('systemBackground') }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            paddingTop: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: pc('separator'),
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: pc('label'),
            }}
          >
            Lista del súper
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            {items.length > 0 && (
              <Pressable onPress={handleShare} hitSlop={8}>
                <IconSymbol name="arrow.up.right" size={22} color={pc('systemOrange')} />
              </Pressable>
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <IconSymbol name="xmark.circle.fill" size={28} color={pc('systemGray3')} />
            </Pressable>
          </View>
        </View>

        {/* Stepper de comensales */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 12,
          }}
        >
          <Text style={{ flex: 1, fontSize: 14, color: pc('secondaryLabel') }}>
            {event.recipes.length} {event.recipes.length === 1 ? 'receta' : 'recetas'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setGuestCount((n) => Math.max(1, n - 1))}
              disabled={guestCount <= 1}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: guestCount <= 1 ? pc('systemFill') : '#FF950018',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: guestCount <= 1 ? pc('systemGray3') : '#FF9500',
                  lineHeight: 24,
                }}
              >
                −
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: pc('label'),
                minWidth: 80,
                textAlign: 'center',
              }}
            >
              {guestCount} {guestCount === 1 ? 'persona' : 'personas'}
            </Text>
            <Pressable
              onPress={() => setGuestCount((n) => n + 1)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#FF950018',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#FF9500',
                  lineHeight: 24,
                }}
              >
                +
              </Text>
            </Pressable>
          </View>
        </View>

        {items.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <IconSymbol name="cart" size={48} color={pc('systemGray3')} />
            <Text style={{ fontSize: 17, color: pc('secondaryLabel') }}>
              No hay ingredientes en este evento
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.name}::${item.unit}`}
            contentContainerStyle={{ padding: 16, gap: 2 }}
            renderItem={({ item, index }) => (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: index % 2 === 0
                    ? (pc('secondarySystemBackground'))
                    : 'transparent',
                  borderRadius: 8,
                  borderCurve: 'continuous',
                }}
              >
                <Text
                  selectable
                  style={{
                    fontSize: 16,
                    color: pc('label'),
                    flex: 1,
                    textTransform: 'capitalize',
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: 16,
                    color: pc('secondaryLabel'),
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {item.quantity} {item.unit}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
