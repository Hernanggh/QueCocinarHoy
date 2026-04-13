import { pc } from '@/lib/colors';
import { Stack } from 'expo-router';

export default function EventsStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: 'systemMaterial',
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: pc('systemOrange'),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Eventos' }} />
      <Stack.Screen name="event/[id]" options={{ title: '', headerLargeTitle: false }} />
      <Stack.Screen
        name="event/new"
        options={{
          presentation: 'modal',
          title: 'Nuevo Evento',
          headerLargeTitle: false,
          headerTransparent: false,
          headerBlurEffect: undefined,
        }}
      />
    </Stack>
  );
}
