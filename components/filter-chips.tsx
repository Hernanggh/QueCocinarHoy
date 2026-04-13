import { pc } from '@/lib/colors';
import { ScrollView, Pressable, Text } from 'react-native';

type Item = { id: number; name: string };

type FilterChipsProps = {
  items: Item[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
};

export function FilterChips({ items, selectedId, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={({ pressed }) => ({
          backgroundColor: selectedId === null ? pc('systemOrange') : pc('secondarySystemBackground'),
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: selectedId === null ? '600' : '400',
            color: selectedId === null ? '#fff' : pc('label'),
          }}
        >
          Todas
        </Text>
      </Pressable>
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(selected ? null : item.id)}
            style={({ pressed }) => ({
              backgroundColor: selected
                ? (pc('systemOrange'))
                : (pc('secondarySystemBackground')),
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: selected ? '600' : '400',
                color: selected ? '#fff' : (pc('label')),
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
