import { pc } from '@/lib/colors';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AppLayoutWeb() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: pc('systemOrange'),
      }}
    >
      <Tabs.Screen
        name="(recipes)"
        options={{
          title: 'Recetas',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="fork.knife" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(events)"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
