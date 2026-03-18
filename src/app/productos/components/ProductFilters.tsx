"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Tag,
  Package,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

type SortOption = {
  value: string;
  label: string;
};

const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Más nuevos" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre: A-Z" },
  { value: "name_desc", label: "Nombre: Z-A" },
];

export default function ProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estado local de los filtros (inicializado desde URL)
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [inStock, setInStock] = useState(searchParams.get("inStock") === "true");
  const [showFilters, setShowFilters] = useState(false);

  // Ref para evitar navegar cuando los parámetros no cambian
  const isFirstRender = useRef(true);

  // Función para construir los nuevos parámetros
  const buildParams = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    if (inStock) params.set("inStock", "true");
    else params.delete("inStock");
    params.delete("page"); // resetear a página 1
    return params;
  }, [searchParams, sort, minPrice, maxPrice, inStock]);

  // Navegar solo si los parámetros cambiaron realmente
 const navigateWithParams = useCallback(() => {
  const newParams = buildParams(); // sin page
  const currentParams = new URLSearchParams(searchParams);
  // Eliminamos page de currentParams para la comparación
  currentParams.delete("page");
  // Ordenar para comparación consistente
  newParams.sort();
  currentParams.sort();
  if (newParams.toString() !== currentParams.toString()) {
    router.push(`${pathname}?${newParams.toString()}`);
  }
}, [buildParams, pathname, router, searchParams]);

  // Efecto para sort e inStock (sin debounce)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    navigateWithParams();
  }, [sort, inStock, navigateWithParams]);

  // Efecto con debounce para precios
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      navigateWithParams();
    }, 500);
    return () => clearTimeout(timer);
  }, [minPrice, maxPrice, navigateWithParams]);

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setInStock(false);
  };

  // Contar filtros activos
  const activeFiltersCount = [
    sort !== "newest",
    !!minPrice,
    !!maxPrice,
    inStock,
  ].filter(Boolean).length;

  return (
    <div className="mb-8 space-y-4">
      {/* Barra superior con filtros rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              showFilters || activeFiltersCount > 0
                ? "border-conquer-orange bg-conquer-orange/10 text-conquer-orange"
                : "border-conquer-pink/30 text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/5"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-conquer-orange text-xs text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Ordenamiento */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-10 appearance-none rounded-full border border-conquer-pink/30 bg-white px-4 pr-10 text-sm font-medium text-conquer-navy outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-conquer-navy/60 pointer-events-none" />
          </div>
        </div>

        {/* Limpiar filtros */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-conquer-navy/70 hover:text-conquer-orange"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Panel de filtros desplegable */}
      {showFilters && (
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-5 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtro por precio */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                <DollarSign className="h-4 w-4" />
                Rango de precio
              </h4>
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

            {/* Filtro por stock */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                <Package className="h-4 w-4" />
                Disponibilidad
              </h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="h-5 w-5 rounded border-conquer-pink/30 text-conquer-orange focus:ring-conquer-orange/20"
                />
                <span className="text-sm text-neutral-700">Solo productos con stock</span>
              </label>
            </div>

            {/* Filtro por categoría */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                <Tag className="h-4 w-4" />
                Categoría
              </h4>
              <div className="text-sm text-neutral-600">
                {searchParams.get("cat") ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-conquer-pink/20 px-3 py-1.5">
                    {searchParams.get("cat")}
                    <button
                      onClick={() => {
                        const params = new URLSearchParams(searchParams);
                        params.delete("cat");
                        router.push(`${pathname}?${params.toString()}`);
                      }}
                      className="ml-1 rounded-full p-0.5 hover:bg-conquer-pink/40"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <Link href="/productos" className="text-conquer-orange hover:underline">
                    Seleccionar categoría
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}