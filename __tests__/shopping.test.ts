import { buildShoppingList } from '@/lib/shopping';
import type { Event, Recipe } from '@/types/app';

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1',
    user_id: 'u1',
    name: 'Receta',
    description: null,
    photo_url: null,
    reference_url: null,
    base_servings: 4,
    prep_time_min: 0,
    cook_time_min: 0,
    difficulty: 'facil',
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    parent_recipe_id: null,
    categories: [],
    methods: [],
    steps: [],
    sauces: [],
    variations: [],
    ingredients: [],
    ...overrides,
  };
}

function makeEvent(recipes: Recipe[], guestCount = 4): Event {
  return {
    id: 'e1',
    user_id: 'u1',
    name: 'Cena',
    event_date: '2024-12-25',
    event_time: null,
    location: null,
    guest_count: guestCount,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    recipes,
  };
}

const ing = (name: string, quantity: number, unit: string, order_index = 0) => ({
  id: `i_${name}`,
  recipe_id: 'r1',
  name,
  quantity,
  unit,
  order_index,
});

describe('buildShoppingList', () => {
  it('devuelve lista vacía para evento sin recetas', () => {
    expect(buildShoppingList(makeEvent([]))).toEqual([]);
  });

  it('escala ingredientes según guests / base_servings', () => {
    const recipe = makeRecipe({
      base_servings: 2,
      ingredients: [ing('Carne', 200, 'g')],
    });
    const result = buildShoppingList(makeEvent([recipe], 4));
    expect(result).toEqual([{ name: 'carne', unit: 'g', quantity: 400 }]);
  });

  it('usa guestCount override en lugar del evento', () => {
    const recipe = makeRecipe({
      base_servings: 4,
      ingredients: [ing('Arroz', 100, 'g')],
    });
    const event = makeEvent([recipe], 4);
    const result = buildShoppingList(event, 8);
    expect(result).toEqual([{ name: 'arroz', unit: 'g', quantity: 200 }]);
  });

  it('agrupa mismo ingrediente + unidad entre recetas', () => {
    const r1 = makeRecipe({ id: 'r1', base_servings: 4, ingredients: [ing('Sal', 5, 'g')] });
    const r2 = makeRecipe({ id: 'r2', base_servings: 4, ingredients: [ing('Sal', 3, 'g')] });
    const result = buildShoppingList(makeEvent([r1, r2], 4));
    expect(result).toEqual([{ name: 'sal', unit: 'g', quantity: 8 }]);
  });

  it('NO agrupa mismo nombre con distinta unidad', () => {
    const recipe = makeRecipe({
      base_servings: 4,
      ingredients: [ing('Ajo', 2, 'dientes'), ing('Ajo', 10, 'g')],
    });
    const result = buildShoppingList(makeEvent([recipe], 4));
    expect(result).toHaveLength(2);
  });

  it('normaliza nombre e unidad a minúsculas al agrupar', () => {
    const r1 = makeRecipe({ id: 'r1', base_servings: 4, ingredients: [ing('TOMATE', 2, 'KG')] });
    const r2 = makeRecipe({ id: 'r2', base_servings: 4, ingredients: [ing('tomate', 1, 'kg')] });
    const result = buildShoppingList(makeEvent([r1, r2], 4));
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('incluye ingredientes de salsas vinculadas a la receta', () => {
    const salsa = makeRecipe({
      id: 'sauce1',
      name: 'Salsa roja',
      base_servings: 4,
      ingredients: [ing('Chile', 4, 'pz')],
    });
    const recipe = makeRecipe({
      base_servings: 4,
      ingredients: [ing('Carne', 200, 'g')],
      sauces: [salsa],
    });
    const result = buildShoppingList(makeEvent([recipe], 4));
    expect(result).toHaveLength(2);
    const chile = result.find((i) => i.name === 'chile');
    expect(chile?.quantity).toBe(4);
  });

  it('escala ingredientes de salsas igual que la receta principal', () => {
    const salsa = makeRecipe({
      id: 'sauce1',
      base_servings: 4,
      ingredients: [ing('Limón', 2, 'pz')],
    });
    const recipe = makeRecipe({
      base_servings: 4,
      sauces: [salsa],
    });
    const result = buildShoppingList(makeEvent([recipe], 8));
    const limon = result.find((i) => i.name === 'limón');
    expect(limon?.quantity).toBe(4);
  });

  it('redondea a 2 decimales', () => {
    const recipe = makeRecipe({
      base_servings: 3,
      ingredients: [ing('Harina', 100, 'g')],
    });
    const result = buildShoppingList(makeEvent([recipe], 4));
    expect(result[0].quantity).toBe(133.33);
  });

  it('ordena la lista por nombre en español', () => {
    const recipe = makeRecipe({
      base_servings: 4,
      ingredients: [ing('Zanahoria', 1, 'pz'), ing('Ajo', 2, 'dientes'), ing('Cebolla', 1, 'pz')],
    });
    const result = buildShoppingList(makeEvent([recipe], 4));
    expect(result.map((i) => i.name)).toEqual(['ajo', 'cebolla', 'zanahoria']);
  });

  it('escala 1:1 cuando guests == base_servings', () => {
    const recipe = makeRecipe({
      base_servings: 6,
      ingredients: [ing('Pasta', 500, 'g')],
    });
    const result = buildShoppingList(makeEvent([recipe], 6));
    expect(result[0].quantity).toBe(500);
  });
});
