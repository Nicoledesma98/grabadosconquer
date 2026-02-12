"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  ChevronDown,
  Tag,
  Sparkles,
  TrendingUp,
  Package,
  X,
} from "lucide-react";

type CategoryDTO = { id: string; slug: string; name: string };

export default function CategoriesDropdown() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Cargar categorías (solo una vez al montar)
  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/categories", {
          cache: "force-cache",
          next: { revalidate: 3600 }, // 1 hora
        });
        const data = (await res.json()) as CategoryDTO[];
        if (isMounted) setCategories(data);
      } catch (error) {
        console.error("Error cargando categorías:", error);
        if (isMounted) setCategories([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  // Organizar categorías en columnas (máx. 8 por columna)
  const columns = useMemo(() => {
    if (categories.length === 0) return [];
    const itemsPerColumn = 8;
    const cols: CategoryDTO[][] = [];
    for (let i = 0; i < categories.length; i += itemsPerColumn) {
      cols.push(categories.slice(i, i + itemsPerColumn));
    }
    return cols;
  }, [categories]);

  // Icono aleatorio pero determinístico basado en el nombre
  const getCategoryIcon = (name: string) => {
    const hash = name.length % 4;
    switch (hash) {
      case 0:
        return <Tag className="h-4 w-4" />;
      case 1:
        return <Sparkles className="h-4 w-4" />;
      case 2:
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleCategoryClick = (slug: string) => {
    setOpen(false);
    router.push(`/productos?cat=${encodeURIComponent(slug)}`);
  };

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
          open
            ? "border-conquer-orange bg-conquer-orange/10 text-conquer-orange"
            : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-pink/5"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Categorías"
      >
        <LayoutGrid
          className={`h-5 w-5 transition-colors ${
            open ? "text-conquer-orange" : "text-conquer-navy group-hover:text-conquer-orange"
          }`}
        />
        <span className="hidden sm:inline">Categorías</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown / Mega menú */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 mt-3 w-screen max-w-md animate-in fade-in slide-in-from-top-2 duration-200 md:left-auto md:w-auto"
        >
          <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-conquer-pink/20 pb-2">
              <span className="text-sm font-semibold text-conquer-navy">
                Todas las categorías
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-neutral-500 hover:bg-conquer-pink/10 hover:text-conquer-navy"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenido */}
            <div className="mt-3">
              {loading ? (
                // Skeleton loader animado
                <div className="flex flex-col gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-full animate-pulse rounded-xl bg-conquer-pink/20"
                    />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="py-6 text-center text-sm text-neutral-500">
                  No hay categorías disponibles
                </div>
              ) : (
                // Grid de categorías (columnas)
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))`,
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-1">
                      {col.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryClick(category.slug)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-conquer-navy transition-all hover:bg-conquer-orange/10 hover:text-conquer-orange group"
                        >
                          <span className="text-conquer-navy/60 group-hover:text-conquer-orange">
                            {getCategoryIcon(category.name)}
                          </span>
                          <span className="flex-1 truncate font-medium">
                            {category.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con enlace "Ver todas" */}
            {!loading && categories.length > 0 && (
              <div className="mt-4 border-t border-conquer-pink/20 pt-3">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push("/productos");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-conquer-pink/10 px-4 py-2 text-sm font-medium text-conquer-navy transition-colors hover:bg-conquer-orange hover:text-white"
                >
                  Ver todos los productos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}