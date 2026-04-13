import { pc } from '@/lib/colors';
import { Stack } from 'expo-router';

export default function RecipesStack() {
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
      <Stack.Screen name="index" options={{ title: 'Recetas' }} />
      <Stack.Screen name="recipe/[id]" options={{ title: '', headerLargeTitle: false }} />
      <Stack.Screen
        name="recipe/new"
        options={{
          presentation: 'modal',
          title: 'Nueva Receta',
          headerLargeTitle: false,
          headerTransparent: false,
          headerBlurEffect: undefined,
        }}
      />
    </Stack>
  );
}
