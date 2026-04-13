import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CookingMethod } from '@/types/app';

type LookupData = {
  categories: Category[];
  methods: CookingMethod[];
  loading: boolean;
};

export function useLookupData(): LookupData {
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<CookingMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [catRes, methRes] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase.from('cooking_methods').select('*').order('id'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (methRes.data) setMethods(methRes.data);
      setLoading(false);
    }
    fetch();
  }, []);

  return { categories, methods, loading };
}
