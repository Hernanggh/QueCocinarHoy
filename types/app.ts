export type DifficultyLevel = 'facil' | 'medio' | 'dificil';

export type Category = {
  id: number;
  name: string;
};

export type CookingMethod = {
  id: number;
  name: string;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number;
  unit: string;
  order_index: number;
};

export type Step = {
  id: string;
  recipe_id: string;
  description: string;
  order_index: number;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  reference_url: string | null;
  base_servings: number;
  prep_time_min: number;
  cook_time_min: number;
  difficulty: DifficultyLevel;
  notes: string | null;
  created_at: string;
  parent_recipe_id: string | null;
  categories: Category[];
  methods: CookingMethod[];
  ingredients: Ingredient[];
  steps: Step[];
  sauces: Recipe[];
  variations: Recipe[];
  variation_name?: string | null;
};

export type Event = {
  id: string;
  user_id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  guest_count: number;
  notes: string | null;
  created_at: string;
  recipes: Recipe[];
};

export type ShoppingItem = {
  name: string;
  unit: string;
  quantity: number;
};
