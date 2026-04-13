import type { Recipe, Event } from '@/types/app';

function normalizeSauce(raw: any): Pick<Recipe, 'id' | 'name' | 'ingredients'> {
  return {
    id: raw.id,
    name: raw.name,
    ingredients: (raw.ingredients ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
  };
}

export function normalizeRecipe(raw: any): Recipe {
  return {
    id: raw.id,
    user_id: raw.user_id,
    name: raw.name,
    description: raw.description ?? null,
    photo_url: raw.photo_url ?? null,
    reference_url: raw.reference_url ?? null,
    base_servings: raw.base_servings,
    prep_time_min: raw.prep_time_min,
    cook_time_min: raw.cook_time_min,
    difficulty: raw.difficulty,
    notes: raw.notes ?? null,
    created_at: raw.created_at,
    categories: (raw.recipe_categories ?? []).map((rc: any) => rc.categories).filter(Boolean),
    methods: (raw.recipe_methods ?? []).map((rm: any) => rm.cooking_methods).filter(Boolean),
    ingredients: (raw.ingredients ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
    steps: (raw.steps ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
    sauces: (raw.recipe_sauces ?? [])
      .map((rs: any) => rs.sauce)
      .filter(Boolean)
      .map(normalizeSauce) as Recipe[],
  };
}

export function normalizeRecipes(raw: any[]): Recipe[] {
  return raw.map(normalizeRecipe);
}

export function normalizeEvents(raw: any[]): Event[] {
  return raw.map((e) => ({
    id: e.id,
    user_id: e.user_id,
    name: e.name,
    event_date: e.event_date,
    event_time: e.event_time ?? null,
    location: e.location ?? null,
    guest_count: e.guest_count,
    notes: e.notes ?? null,
    created_at: e.created_at,
    recipes: (e.event_recipes ?? [])
      .map((er: any) => er.recipes)
      .filter(Boolean)
      .map((r: any) => normalizeRecipe(r)),
  }));
}
