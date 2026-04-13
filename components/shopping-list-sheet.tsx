import { pc } from '@/lib/colors';
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
  const items = buildShoppingList(event);

  const handleShare = async () => {
    const header = `Lista del súper — ${event.name} (${event.guest_count} personas)\n\n`;
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

        {/* Subtitle */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: 14, color: pc('secondaryLabel') }}>
            {event.guest_count} {event.guest_count === 1 ? 'persona' : 'personas'} · {event.recipes.length} {event.recipes.length === 1 ? 'receta' : 'recetas'}
          </Text>
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
