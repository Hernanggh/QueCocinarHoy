import type { Event, Ingredient, ShoppingItem } from '@/types/app';

function addIngredients(
  map: Map<string, number>,
  ingredients: Ingredient[],
  scale: number
): void {
  for (const ing of ingredients) {
    const key = `${ing.name.toLowerCase().trim()}::${ing.unit.toLowerCase().trim()}`;
    map.set(key, (map.get(key) ?? 0) + ing.quantity * scale);
  }
}

export function buildShoppingList(event: Event): ShoppingItem[] {
  const map = new Map<string, number>();

  for (const recipe of event.recipes) {
    const scale = event.guest_count / recipe.base_servings;
    // Ingredientes directos
    addIngredients(map, recipe.ingredients, scale);
    // Ingredientes de salsas vinculadas (misma escala)
    for (const sauce of recipe.sauces ?? []) {
      addIngredients(map, sauce.ingredients, scale);
    }
  }

  return Array.from(map.entries())
    .map(([key, quantity]) => {
      const [name, unit] = key.split('::');
      return { name, unit, quantity: Math.round(quantity * 100) / 100 };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
