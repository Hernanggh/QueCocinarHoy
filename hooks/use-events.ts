import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeEvents } from '@/lib/normalizers';
import { useAuth } from '@/context/auth';
import type { Event } from '@/types/app';

const EVENT_SELECT = `
  *,
  event_recipes (
    variation_id,
    variation:recipes!variation_id ( id, name, ingredients(*) ),
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
    } else if (data) {
      setEvents(normalizeEvents(data));
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

  return { events, loading, refetch: fetchEvents, removeEvent };
}
