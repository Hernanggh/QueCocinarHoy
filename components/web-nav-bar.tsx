import { pc } from '@/lib/colors';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useAuth } from '@/context/auth';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export function WebNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 600;

  const visibleRoutes = state.routes.filter((r) => r.name !== 'index');

  return (
    <View
      style={{
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: pc('systemBackground'),
        borderBottomWidth: 0.5,
        borderBottomColor: pc('separator'),
        gap: 8,
        zIndex: 100,
      }}
    >
      {/* Logo + nombre de la app */}
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('../assets/images/icon.png')}
        style={{ width: 28, height: 28, borderRadius: 7 }}
      />
      {!isCompact && (
        <Text
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: pc('label'),
            marginRight: 12,
          }}
        >
          QuéCocinarHoy
        </Text>
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {visibleRoutes.map((route) => {
          const descriptor = descriptors[route.key];
          const label = descriptor.options.title ?? route.name;
          const routeIndex = state.routes.indexOf(route);
          const isFocused = state.index === routeIndex;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => ({
                paddingHorizontal: isCompact ? 10 : 14,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: isFocused ? '#FF950018' : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isFocused ? '700' : '500',
                  color: isFocused ? '#FF9500' : pc('secondaryLabel'),
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Espacio flexible */}
      <View style={{ flex: 1 }} />

      {/* Cerrar sesión */}
      <Pressable
        onPress={signOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <IconSymbol
          name="rectangle.portrait.and.arrow.right"
          size={16}
          color={pc('secondaryLabel')}
        />
        {!isCompact && (
          <Text style={{ fontSize: 14, color: pc('secondaryLabel') }}>Cerrar sesión</Text>
        )}
      </Pressable>
    </View>
  );
}
