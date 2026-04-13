import { View, Text } from 'react-native';
import { DifficultyColors, DifficultyLabels } from '@/constants/theme';
import type { DifficultyLevel } from '@/types/app';

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel }) {
  const color = DifficultyColors[difficulty];
  const label = DifficultyLabels[difficulty];
  return (
    <View
      style={{
        backgroundColor: color + '22',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderCurve: 'continuous',
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
