import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AffiliateProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  affiliate_url: string;
  price_indication: string | null;
  category: string;
  tags: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useAffiliateProducts() {
  return useQuery({
    queryKey: ['affiliate-products'],
    queryFn: async (): Promise<AffiliateProduct[]> => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as AffiliateProduct[]) ?? [];
    },
  });
}

export function useAffiliateProductsByCategory(category?: string) {
  return useQuery({
    queryKey: ['affiliate-products', category],
    queryFn: async (): Promise<AffiliateProduct[]> => {
      let query = supabase
        .from('affiliate_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (category && category !== 'alle') {
        query = query.eq('category' as never, category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as AffiliateProduct[]) ?? [];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['affiliate-product-categories'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .select('category');

      if (error) throw error;
      const products = (data as unknown as { category: string }[]) ?? [];
      const categories = [...new Set(products.map(p => p.category))];
      return categories.sort();
    },
  });
}

interface CreateProductInput {
  name: string;
  description?: string;
  image_url?: string;
  affiliate_url: string;
  price_indication?: string;
  category: string;
  tags?: string[];
  is_published?: boolean;
  sort_order?: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data, error } = await supabase
        .from('affiliate_products')
        .insert({
          name: input.name,
          description: input.description || null,
          image_url: input.image_url || null,
          affiliate_url: input.affiliate_url,
          price_indication: input.price_indication || null,
          category: input.category,
          tags: input.tags || [],
          is_published: input.is_published ?? true,
          sort_order: input.sort_order ?? 0,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-product-categories'] });
      toast.success('Product toegevoegd');
    },
    onError: () => {
      toast.error('Kon product niet toevoegen');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateProductInput> & { id: string }) => {
      const { error } = await supabase
        .from('affiliate_products')
        .update(input as never)
        .eq('id' as never, id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-product-categories'] });
      toast.success('Product bijgewerkt');
    },
    onError: () => {
      toast.error('Kon product niet bijwerken');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('affiliate_products')
        .delete()
        .eq('id' as never, id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-product-categories'] });
      toast.success('Product verwijderd');
    },
    onError: () => {
      toast.error('Kon product niet verwijderen');
    },
  });
}
