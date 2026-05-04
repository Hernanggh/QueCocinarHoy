import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CookingMethod } from '@/types/app';

type LookupData = {
  categories: Category[];
  methods: CookingMethod[];
  loading: boolean;
};

let cachedCategories: Category[] | null = null;
let cachedMethods: CookingMethod[] | null = null;

export function useLookupData(): LookupData {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [methods, setMethods] = useState<CookingMethod[]>(cachedMethods ?? []);
  const [loading, setLoading] = useState(cachedCategories === null);

  useEffect(() => {
    if (cachedCategories !== null) return;
    async function fetchLookups() {
      const [catRes, methRes] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase.from('cooking_methods').select('*').order('id'),
      ]);
      if (catRes.data) { cachedCategories = catRes.data; setCategories(catRes.data); }
      if (methRes.data) { cachedMethods = methRes.data; setMethods(methRes.data); }
      setLoading(false);
    }
    fetchLookups();
  }, []);

  return { categories, methods, loading };
}
