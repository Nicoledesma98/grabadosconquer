"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string };

export default function AdminNuevoProductoPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => loading || !name.trim(), [loading, name]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      const data = (await res.json()) as Category[];
      setCategories(data);
    })();
  }, []);

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: description.trim() || null,
          basePrice,
          active,
          imageUrl: imageUrl.trim() || null,
          categoryIds,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(payload?.error || "No se pudo crear el producto");
        return;
      }

      router.push(`/admin/productos/${payload.id}/editar`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>

      <form onSubmit={onSubmit} className="mt-6 rounded-2xl border p-5 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm text-neutral-700">Nombre *</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mate de acero 500ml"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-neutral-700">Slug (opcional)</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ej: mate-acero-500"
          />
          <div className="text-xs text-neutral-500">
            Si lo dejás vacío, se genera desde el nombre.
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-neutral-700">Descripción</label>
          <textarea
            className="min-h-28 rounded-2xl border px-4 py-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción corta para ficha de producto"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm text-neutral-700">Precio base (opcional)</label>
          <input
            className="h-11 rounded-2xl border px-4"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="Ej: 12000"
            inputMode="numeric"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm text-neutral-700">Categorías</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    on ? "bg-black text-white" : "hover:bg-neutral-50"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Producto activo
        </label>

        <button
          disabled={disabled}
          className="h-11 rounded-2xl bg-black text-white disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear producto"}
        </button>
      </form>
    </main>
  );
}
