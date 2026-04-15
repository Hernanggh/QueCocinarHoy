import { View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function OfflineBanner() {
  return (
    <View
      style={{
        backgroundColor: '#FF950018',
        paddingVertical: 7,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <IconSymbol name="wifi.slash" size={13} color="#FF9500" />
      <Text style={{ fontSize: 13, color: '#FF9500', fontWeight: '500' }}>
        Sin conexión — mostrando datos guardados
      </Text>
    </View>
  );
}
