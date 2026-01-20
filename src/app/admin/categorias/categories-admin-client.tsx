"use client";

import { useMemo, useState } from "react";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  _count?: { products?: number };
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function CategoriesAdminClient({
  initialCategories,
}: {
  initialCategories: CategoryRow[];
}) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);

  // crear
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  // edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const disabledCreate = useMemo(() => saving || !name.trim(), [saving, name]);

  async function refresh() {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = (await res.json()) as CategoryRow[];
    setCategories(data);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const finalSlug = (slug.trim() || slugify(name)).trim();
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: finalSlug }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo crear");
        return;
      }

      setName("");
      setSlug("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: CategoryRow) {
    setEditId(c.id);
    setEditName(c.name);
    setEditSlug(c.slug);
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditSlug("");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim() || slugify(editName),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo guardar");
        return;
      }

      cancelEdit();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar categoría? Si tiene productos asociados, puede fallar.")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo borrar");
        return;
      }
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-conquer-navy">Admin · Categorías</h1>
        <a
          href="/admin/productos"
          className="h-10 px-4 rounded-2xl border hover:bg-neutral-50 flex items-center text-sm"
        >
          Ir a Productos
        </a>
      </div>

      {/* Crear */}
      <form onSubmit={onCreate} className="mt-6 rounded-3xl border p-5 bg-white grid gap-3">
        <div className="text-sm font-medium text-conquer-navy">Nueva categoría</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="h-11 rounded-2xl border px-4"
            placeholder="Nombre (ej: Mates y Termos) *"
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              if (!slug.trim()) setSlug(slugify(v));
            }}
          />
          <input
            className="h-11 rounded-2xl border px-4"
            placeholder="Slug (ej: mates-y-termos) (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        <button
          disabled={disabledCreate}
          className="h-11 rounded-2xl bg-conquer-orange text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear categoría"}
        </button>
      </form>

      {/* Listado */}
      <div className="mt-6 rounded-3xl border bg-white overflow-hidden">
        <div className="px-5 py-3 border-b text-sm text-neutral-600">
          Total: <b>{categories.length}</b>
        </div>

        <div className="divide-y">
          {categories.map((c) => {
            const isEdit = editId === c.id;
            const productCount = c?._count?.products ?? 0;

            return (
              <div key={c.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!isEdit ? (
                  <>
                    <div className="min-w-0">
                      <div className="font-medium text-conquer-navy">{c.name}</div>
                      <div className="text-sm text-neutral-600 break-all">
                        <span className="mr-3">/{c.slug}</span>
                        <span className="inline-flex items-center rounded-full bg-conquer-pink/40 px-3 py-1 text-xs font-medium text-conquer-navy">
                          {productCount} productos
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="h-10 px-4 rounded-2xl border hover:bg-neutral-50 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        disabled={saving}
                        className="h-10 px-4 rounded-2xl border border-red-300 text-red-700 hover:bg-red-50 text-sm disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 w-full">
                      <input
                        className="h-11 rounded-2xl border px-4"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <input
                        className="h-11 rounded-2xl border px-4"
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={saving || !editName.trim()}
                        className="h-10 px-4 rounded-2xl bg-conquer-turq text-white hover:opacity-90 disabled:opacity-50 text-sm"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="h-10 px-4 rounded-2xl border hover:bg-neutral-50 text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
