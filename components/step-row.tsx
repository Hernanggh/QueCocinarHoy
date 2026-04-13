import { pc } from '@/lib/colors';
import { View, Text, TextInput, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type StepDraft = {
  id: string;
  description: string;
};

type StepRowProps = {
  step: StepDraft;
  index: number;
  onChange: (updated: StepDraft) => void;
  onDelete: () => void;
};

export function StepRow({ step, index, onChange, onDelete }: StepRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: pc('systemOrange'),
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
          flexShrink: 0,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{index + 1}</Text>
      </View>
      <TextInput
        value={step.description}
        onChangeText={(v) => onChange({ ...step, description: v })}
        placeholder={`Paso ${index + 1}...`}
        multiline
        style={{
          flex: 1,
          backgroundColor: pc('tertiarySystemBackground'),
          padding: 10,
          borderRadius: 8,
          borderCurve: 'continuous',
          fontSize: 15,
          color: pc('label'),
          minHeight: 44,
        }}
      />
      <Pressable onPress={onDelete} hitSlop={8} style={{ marginTop: 10 }}>
        <IconSymbol name="xmark.circle.fill" size={22} color={pc('systemRed')} />
      </Pressable>
    </View>
  );
}
