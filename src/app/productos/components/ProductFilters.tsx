"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Search,
  Tag,
  Filter,
  RotateCcw,
  Package,
} from "lucide-react";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryNode[];
};

type Filters = {
  q?: string;
  cat?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

function buildQueryString(params: Record<string, string | number | undefined | boolean>) {
  const sp = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (typeof v === "boolean") {
      if (v) sp.set(k, "true");
      continue;
    }
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export default function ProductFilters({
  categories,
  initialFilters,
}: {
  categories: CategoryNode[];
  initialFilters: Filters;
}) {
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [sort, setSort] = useState(initialFilters.sort ?? "newest");
  const [minPrice, setMinPrice] = useState(
    initialFilters.minPrice != null ? String(initialFilters.minPrice) : ""
  );
  const [maxPrice, setMaxPrice] = useState(
    initialFilters.maxPrice != null ? String(initialFilters.maxPrice) : ""
  );
  const [inStock, setInStock] = useState(Boolean(initialFilters.inStock));

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );

  const initiallyOpen = useMemo(() => {
    const selected = initialFilters.cat ?? "";
    if (!selected) return new Set<string>();

    const set = new Set<string>();

    for (const parent of parentCategories) {
      if (parent.slug === selected) set.add(parent.id);

      if (parent.children?.some((child) => child.slug === selected)) {
        set.add(parent.id);
      }
    }

    return set;
  }, [initialFilters.cat, parentCategories]);

  const [openParents, setOpenParents] = useState<Set<string>>(initiallyOpen);

  function toggleParent(id: string) {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function hrefForCategory(slug: string) {
    return `/productos${buildQueryString({
      q,
      cat: slug,
      sort,
      minPrice,
      maxPrice,
      inStock,
    })}`;
  }

  function submitHref() {
    return `/productos${buildQueryString({
      q,
      cat: initialFilters.cat,
      sort,
      minPrice,
      maxPrice,
      inStock,
    })}`;
  }

  return (
    <div className="rounded-3xl border border-conquer-pink/30 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-conquer-pink/20 pb-3">
        <Filter className="h-5 w-5 text-conquer-orange" />
        <h2 className="text-base font-semibold text-conquer-navy">Filtros</h2>
      </div>

      <form action="/productos" method="GET" className="mt-4 space-y-5">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy">
            <Search className="h-4 w-4" />
            Buscar
          </label>
          <input
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o descripción..."
            className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-conquer-navy">Ordenar por</label>
          <select
            name="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
          >
            <option value="newest">Más nuevos</option>
            <option value="price_asc">Precio menor a mayor</option>
            <option value="price_desc">Precio mayor a menor</option>
            <option value="name_asc">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy">
            <Tag className="h-4 w-4" />
            Categorías
          </label>

          <div className="space-y-2">
            <Link
              href={`/productos${buildQueryString({
                q,
                sort,
                minPrice,
                maxPrice,
                inStock,
              })}`}
              className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                !initialFilters.cat
                  ? "bg-conquer-orange text-white"
                  : "text-conquer-navy hover:bg-conquer-pink/10"
              }`}
            >
              Todas
            </Link>

            {parentCategories.map((parent) => {
              const isParentSelected = initialFilters.cat === parent.slug;
              const hasChildren = (parent.children?.length ?? 0) > 0;
              const isOpen = openParents.has(parent.id);

              return (
                <div
                  key={parent.id}
                  className="rounded-2xl border border-conquer-pink/20"
                >
                  <div className="flex items-center">
                    <Link
                      href={hrefForCategory(parent.slug)}
                      className={`flex-1 rounded-l-2xl px-3 py-2 text-sm transition-colors ${
                        isParentSelected
                          ? "bg-conquer-orange text-white"
                          : "text-conquer-navy hover:bg-conquer-pink/10"
                      }`}
                    >
                      {parent.name}
                    </Link>

                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleParent(parent.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-r-2xl text-conquer-navy hover:bg-conquer-pink/10"
                        aria-label={`Mostrar subcategorías de ${parent.name}`}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {hasChildren && isOpen && (
                    <div className="border-t border-conquer-pink/20 px-2 py-2">
                      <div className="space-y-1">
                        {parent.children!.map((child) => {
                          const isChildSelected = initialFilters.cat === child.slug;

                          return (
                            <Link
                              key={child.id}
                              href={hrefForCategory(child.slug)}
                              className={`block rounded-xl px-3 py-2 pl-6 text-sm transition-colors ${
                                isChildSelected
                                  ? "bg-conquer-turq text-conquer-navy font-medium"
                                  : "text-neutral-700 hover:bg-conquer-pink/10"
                              }`}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-conquer-navy">Precio mín.</label>
            <input
              name="minPrice"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-conquer-navy">Precio máx.</label>
            <input
              name="maxPrice"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              inputMode="numeric"
              placeholder="999999"
              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-conquer-pink/20 bg-conquer-pink/5 px-4 py-3">
          <input
            type="checkbox"
            name="inStock"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="h-4 w-4 rounded border-conquer-pink/30 text-conquer-orange focus:ring-conquer-orange/20"
          />
          <span className="text-sm text-conquer-navy">Solo productos con stock</span>
        </label>

        {initialFilters.cat ? (
          <input type="hidden" name="cat" value={initialFilters.cat} />
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-conquer-orange text-white font-semibold shadow-md transition-all hover:scale-[1.01] hover:shadow-lg"
          >
            <Package className="h-4 w-4" />
            Aplicar filtros
          </button>

          <Link
            href="/productos"
            className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-conquer-pink/30 text-conquer-navy transition-colors hover:bg-conquer-pink/10"
          >
            <RotateCcw className="h-4 w-4" />
            Limpiar filtros
          </Link>
        </div>
      </form>
    </div>
  );
}