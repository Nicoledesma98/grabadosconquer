"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryDTO = { id: string; slug: string; name: string };

export default function CategoriesDropdown() {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch("/api/categories", { cache: "no-store" });
        const data = (await res.json()) as CategoryDTO[];
        if (alive) setCategories(data);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
        onClick={() => setOpen((v) => !v)}
      >
        Categorías
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-64 rounded-2xl border bg-white p-2 shadow-sm"
          onMouseLeave={() => setOpen(false)}
        >
          {loadingCats ? (
            <div className="px-3 py-2 text-sm text-neutral-600">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-600">No hay categorías</div>
          ) : (
            categories.map((c) => (
              <button
                key={c.id}
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => {
                  setOpen(false);
                  router.push(`/productos?cat=${encodeURIComponent(c.slug)}`);
                }}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
