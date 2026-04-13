import { pc } from '@/lib/colors';
import { View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';


type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 }}>
      <IconSymbol name={icon as any} size={48} color={pc('systemGray3')} />
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: pc('label'),
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 15,
            color: pc('secondaryLabel'),
            textAlign: 'center',
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
