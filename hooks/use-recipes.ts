import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { normalizeRecipes } from '@/lib/normalizers';
import { useAuth } from '@/context/auth';
import type { Recipe } from '@/types/app';

const RECIPE_SELECT = `
  *,
  recipe_categories ( category_id, categories ( id, name ) ),
  recipe_methods ( method_id, cooking_methods ( id, name ) ),
  ingredients ( * ),
  steps ( * ),
  recipe_sauces!recipe_id ( sauce_recipe_id, sauce:recipes!sauce_recipe_id ( id, name, ingredients(*) ) ),
  variations:recipes!parent_recipe_id ( *, ingredients(*), steps(*) )
`;

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const channelName = useRef(`recipes:${Math.random()}`).current;

  const fetchRecipes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('user_id', user.id)
      .is('parent_recipe_id', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[useRecipes] fetch error:', error.message, error.code);
      setFetchError(error.message);
    } else if (data) {
      setFetchError(null);
      setRecipes(normalizeRecipes(data));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchRecipes().finally(() => setLoading(false));

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes', filter: `user_id=eq.${user.id}` },
        () => fetchRecipes()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRecipes]);

  // En web: refetch cuando la pestaña vuelve a estar visible (captura cambios de otros dispositivos)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRecipes();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchRecipes]);

  return { recipes, loading, fetchError, refetch: fetchRecipes };
}
