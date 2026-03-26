"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Tag, DollarSign, Package, ChevronRight, X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Filters = {
  q?: string;
  cat?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

export default function ProductFilters({ 
  categories,
  initialFilters 
}: { 
  categories: Category[];
  initialFilters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estado local para los inputs (sin depender de initialFilters directamente)
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice?.toString() || "");
  const [inStock, setInStock] = useState(initialFilters.inStock || false);

  // Ref para evitar la primera ejecución del efecto
  const isFirstRender = useRef(true);

  // Sincronizar estado local cuando cambian los parámetros de la URL (por navegación)
  useEffect(() => {
    setMinPrice(searchParams.get("minPrice") || "");
    setMaxPrice(searchParams.get("maxPrice") || "");
    setInStock(searchParams.get("inStock") === "true");
  }, [searchParams]);

// Debounce para precio (solo cuando el usuario escribe y realmente hay cambios)
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }

  const timer = setTimeout(() => {
    // Obtener valores actuales de la URL
    const currentMinPrice = searchParams.get("minPrice") || "";
    const currentMaxPrice = searchParams.get("maxPrice") || "";
    const currentInStock = searchParams.get("inStock") === "true";

    // Si los valores son iguales a los que ya están en la URL, no hacer nada
    if (minPrice === currentMinPrice && maxPrice === currentMaxPrice && inStock === currentInStock) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    if (inStock) params.set("inStock", "true");
    else params.delete("inStock");

    params.delete("page"); // Resetear a página 1
    router.push(`${pathname}?${params.toString()}`);
  }, 500);

  return () => clearTimeout(timer);
}, [minPrice, maxPrice, inStock, pathname, router, searchParams]);
  // Función para construir href de categoría (usando los parámetros actuales)
  const getCategoryHref = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", slug);
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  };

  const clearCategory = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cat");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Sección de categorías */}
      <div className="bg-white rounded-2xl border border-conquer-pink/30 p-5">
        <h3 className="text-sm font-semibold text-conquer-navy mb-3 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Categorías
        </h3>
        <div className="space-y-1">
          {categories.map((cat) => {
            const isActive = initialFilters.cat === cat.slug;
            return (
              <Link
                key={cat.id}
                href={getCategoryHref(cat.slug)}
                className={`flex items-center justify-between py-2 px-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-conquer-orange/10 text-conquer-orange font-medium"
                    : "text-conquer-navy hover:bg-conquer-pink/10"
                }`}
              >
                <span>{cat.name}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </div>
        {initialFilters.cat && (
          <button
            onClick={clearCategory}
            className="mt-3 text-xs text-conquer-orange hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Quitar filtro de categoría
          </button>
        )}
      </div>

      {/* Sección de precio */}
      <div className="bg-white rounded-2xl border border-conquer-pink/30 p-5">
        <h3 className="text-sm font-semibold text-conquer-navy mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Rango de precio
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
            <input
              type="number"
              placeholder="Mín"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-10 w-full rounded-full border border-conquer-pink/30 bg-white pl-7 pr-3 text-sm outline-none focus:border-conquer-orange"
              min="0"
            />
          </div>
          <span className="text-neutral-400">—</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
            <input
              type="number"
              placeholder="Máx"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="h-10 w-full rounded-full border border-conquer-pink/30 bg-white pl-7 pr-3 text-sm outline-none focus:border-conquer-orange"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Sección de stock */}
      <div className="bg-white rounded-2xl border border-conquer-pink/30 p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="h-5 w-5 rounded border-conquer-pink/30 text-conquer-orange focus:ring-conquer-orange/20"
          />
          <span className="text-sm font-medium text-conquer-navy flex items-center gap-2">
            <Package className="h-4 w-4" />
            Solo productos con stock
          </span>
        </label>
      </div>
    </div>
  );
}