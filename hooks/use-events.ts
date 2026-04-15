import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeEvents } from '@/lib/normalizers';
import { saveCache, loadCache } from '@/lib/cache';
import { useAuth } from '@/context/auth';
import type { Event } from '@/types/app';

const EVENT_SELECT = `
  *,
  event_recipes (
    variation_id,
    recipes:recipes!recipe_id (
      *,
      ingredients ( * ),
      recipe_categories ( categories ( id, name ) ),
      recipe_methods ( cooking_methods ( id, name ) ),
      recipe_sauces!recipe_id ( sauce:recipes!sauce_recipe_id ( id, name, ingredients(*) ) )
    )
  )
`;

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const channelName = useRef(`events:${Math.random()}`).current;

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('user_id', user.id)
      .order('event_date', { ascending: false });
    if (error) {
      console.error('[useEvents] fetch error:', error.message, error.code);
      const cached = await loadCache<unknown[]>(`events_${user.id}`);
      if (cached) {
        setEvents(normalizeEvents(cached));
        setIsOffline(true);
      }
    } else if (data) {
      setIsOffline(false);
      setEvents(normalizeEvents(data));
      await saveCache(`events_${user.id}`, data);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchEvents().finally(() => setLoading(false));

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${user.id}` },
        () => fetchEvents()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchEvents]);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, isOffline, refetch: fetchEvents, removeEvent };
}
