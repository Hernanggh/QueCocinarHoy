import { normalizeRecipe, normalizeRecipes, normalizeEvents } from '@/lib/normalizers';

const baseRaw = {
  id: 'r1',
  user_id: 'u1',
  name: 'Taco',
  description: null,
  photo_url: null,
  reference_url: null,
  base_servings: 4,
  prep_time_min: 10,
  cook_time_min: 20,
  difficulty: 'facil' as const,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  parent_recipe_id: null,
};

describe('normalizeRecipe', () => {
  it('rellena arrays vacíos cuando no hay relaciones', () => {
    const result = normalizeRecipe(baseRaw);
    expect(result.categories).toEqual([]);
    expect(result.methods).toEqual([]);
    expect(result.ingredients).toEqual([]);
    expect(result.steps).toEqual([]);
    expect(result.sauces).toEqual([]);
    expect(result.variations).toEqual([]);
  });

  it('mapea categorías desde recipe_categories', () => {
    const raw = {
      ...baseRaw,
      recipe_categories: [
        { categories: { id: 1, name: 'Carne' } },
        { categories: { id: 2, name: 'Rápido' } },
      ],
    };
    const result = normalizeRecipe(raw);
    expect(result.categories).toEqual([
      { id: 1, name: 'Carne' },
      { id: 2, name: 'Rápido' },
    ]);
  });

  it('filtra nulls en categorías (join sin datos)', () => {
    const raw = {
      ...baseRaw,
      recipe_categories: [{ categories: null }, { categories: { id: 1, name: 'Carne' } }],
    };
    const result = normalizeRecipe(raw);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Carne');
  });

  it('ordena ingredientes por order_index', () => {
    const raw = {
      ...baseRaw,
      ingredients: [
        { id: 'i2', recipe_id: 'r1', name: 'Sal', quantity: 1, unit: 'g', order_index: 2 },
        { id: 'i0', recipe_id: 'r1', name: 'Aceite', quantity: 30, unit: 'ml', order_index: 0 },
        { id: 'i1', recipe_id: 'r1', name: 'Carne', quantity: 200, unit: 'g', order_index: 1 },
      ],
    };
    const result = normalizeRecipe(raw);
    expect(result.ingredients.map((i) => i.name)).toEqual(['Aceite', 'Carne', 'Sal']);
  });

  it('ordena pasos por order_index', () => {
    const raw = {
      ...baseRaw,
      steps: [
        { id: 's1', recipe_id: 'r1', description: 'Freír', order_index: 1 },
        { id: 's0', recipe_id: 'r1', description: 'Lavar', order_index: 0 },
      ],
    };
    const result = normalizeRecipe(raw);
    expect(result.steps.map((s) => s.description)).toEqual(['Lavar', 'Freír']);
  });

  it('normaliza salsas y ordena sus ingredientes', () => {
    const raw = {
      ...baseRaw,
      recipe_sauces: [
        {
          sauce: {
            id: 's1',
            name: 'Salsa verde',
            ingredients: [
              { id: 'si2', recipe_id: 's1', name: 'Chile', quantity: 2, unit: 'pz', order_index: 1 },
              { id: 'si1', recipe_id: 's1', name: 'Aguacate', quantity: 1, unit: 'pz', order_index: 0 },
            ],
          },
        },
      ],
    };
    const result = normalizeRecipe(raw);
    expect(result.sauces).toHaveLength(1);
    expect(result.sauces[0].name).toBe('Salsa verde');
    expect(result.sauces[0].ingredients.map((i) => i.name)).toEqual(['Aguacate', 'Chile']);
  });

  it('filtra salsas null en recipe_sauces', () => {
    const raw = {
      ...baseRaw,
      recipe_sauces: [{ sauce: null }, { sauce: { id: 's1', name: 'Roja', ingredients: [] } }],
    };
    const result = normalizeRecipe(raw);
    expect(result.sauces).toHaveLength(1);
  });

  it('normaliza variaciones con arrays vacíos en sus relaciones', () => {
    const raw = {
      ...baseRaw,
      variations: [
        { ...baseRaw, id: 'r2', name: 'Taco vegano', parent_recipe_id: 'r1' },
      ],
    };
    const result = normalizeRecipe(raw);
    expect(result.variations).toHaveLength(1);
    expect(result.variations[0].name).toBe('Taco vegano');
    expect(result.variations[0].categories).toEqual([]);
    expect(result.variations[0].sauces).toEqual([]);
  });

  it('conserva null en campos opcionales', () => {
    const result = normalizeRecipe(baseRaw);
    expect(result.description).toBeNull();
    expect(result.photo_url).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.parent_recipe_id).toBeNull();
  });
});

describe('normalizeRecipes', () => {
  it('mapea un array de recetas', () => {
    const results = normalizeRecipes([baseRaw, { ...baseRaw, id: 'r2', name: 'Sopa' }]);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('Taco');
    expect(results[1].name).toBe('Sopa');
  });

  it('devuelve array vacío para input vacío', () => {
    expect(normalizeRecipes([])).toEqual([]);
  });
});

describe('normalizeEvents', () => {
  const rawEvent = {
    id: 'e1',
    user_id: 'u1',
    name: 'Cena',
    event_date: '2024-12-25',
    event_time: null,
    location: null,
    guest_count: 8,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
  };

  it('normaliza evento sin recetas', () => {
    const result = normalizeEvents([rawEvent]);
    expect(result).toHaveLength(1);
    expect(result[0].recipes).toEqual([]);
  });

  it('normaliza event_recipes y filtra nulls', () => {
    const raw = {
      ...rawEvent,
      event_recipes: [
        { recipes: null },
        { recipes: { ...baseRaw, id: 'r1' } },
      ],
    };
    const result = normalizeEvents([raw]);
    expect(result[0].recipes).toHaveLength(1);
    expect(result[0].recipes[0].name).toBe('Taco');
  });

  it('preserva campos opcionales null/undefined', () => {
    const result = normalizeEvents([rawEvent]);
    expect(result[0].event_time).toBeNull();
    expect(result[0].location).toBeNull();
    expect(result[0].notes).toBeNull();
  });
});
