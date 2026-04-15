import { pc } from '@/lib/colors';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WebNavBar } from '@/components/web-nav-bar';

export default function AppLayoutWeb() {
  return (
    <Tabs
      initialRouteName="(recipes)"
      tabBar={(props) => <WebNavBar {...props} />}
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
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
