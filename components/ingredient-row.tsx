import { pc } from '@/lib/colors';
import { View, TextInput, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type IngredientDraft = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

type IngredientRowProps = {
  ingredient: IngredientDraft;
  onChange: (updated: IngredientDraft) => void;
  onDelete: () => void;
};

const inputBase = {
  backgroundColor: pc('tertiarySystemBackground'),
  padding: 10,
  borderRadius: 8,
  borderCurve: 'continuous' as const,
  fontSize: 15,
  color: pc('label'),
};

export function IngredientRow({ ingredient, onChange, onDelete }: IngredientRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <TextInput
        value={ingredient.quantity}
        onChangeText={(v) => onChange({ ...ingredient, quantity: v })}
        placeholder="Cant."
        keyboardType="decimal-pad"
        style={[inputBase, { width: 60 }]}
      />
      <TextInput
        value={ingredient.unit}
        onChangeText={(v) => onChange({ ...ingredient, unit: v })}
        placeholder="Unidad"
        style={[inputBase, { width: 80 }]}
      />
      <TextInput
        value={ingredient.name}
        onChangeText={(v) => onChange({ ...ingredient, name: v })}
        placeholder="Ingrediente"
        style={[inputBase, { flex: 1 }]}
      />
      <Pressable onPress={onDelete} hitSlop={8}>
        <IconSymbol name="xmark.circle.fill" size={22} color={pc('systemRed')} />
      </Pressable>
    </View>
  );
}
