import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useProducts({
  category,
  search,
  limit,
  featured,
  bestSeller,
  newArrival,
  specialOffer,
} = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      if (featured) {
        query = query.eq("featured", true);
      }

      if (bestSeller) {
        query = query.eq("best_seller", true);
      }

      if (newArrival) {
        query = query.eq("new_arrival", true);
      }

      if (specialOffer) {
        query = query.eq("special_offer", true);
      }

      if (search?.trim()) {
        const value = search.trim();

        query = query.or(
          `name.ilike.%${value}%,description.ilike.%${value}%,category.ilike.%${value}%`
        );
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setProducts([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    category,
    search,
    limit,
    featured,
    bestSeller,
    newArrival,
    specialOffer,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    refetch: loadProducts,
  };
}

/*
 * Single product hook used by ProductDetail.jsx
 */
export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    const loadProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("active", true)
          .single();

        if (queryError) {
          throw queryError;
        }

        setProduct(data || null);
      } catch (err) {
        console.error("Failed to load product:", err);
        setProduct(null);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  return {
    product,
    loading,
    error,
  };
}

/*
 * Optional helper for places that need a one-time product fetch
 */
export async function getProduct(id) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (error) {
    throw error;
  }

  return data;
}