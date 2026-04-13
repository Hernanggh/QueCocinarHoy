import { pc } from '@/lib/colors';
import { FlatList, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useEvents } from '@/hooks/use-events';
import { EventCard } from '@/components/event-card';
import { LoadingScreen } from '@/components/loading-screen';
import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EventsScreen() {
  const router = useRouter();
  const { events, loading } = useEvents();

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/event/new' as any)}
              hitSlop={8}
            >
              <IconSymbol name="plus" size={24} color={pc('systemOrange')} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="Sin eventos aún"
            subtitle="Toca el + para planear tu primera cena"
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(400).delay(index * 60)}>
            <Pressable
              onPress={() => router.push(`/event/${item.id}` as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <EventCard event={item} />
            </Pressable>
          </Animated.View>
        )}
      />
    </>
  );
}
