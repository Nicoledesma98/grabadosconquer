"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Folder,
  Hash,
  Image as ImageIcon,
  Package,
} from "lucide-react";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children?: {
    id: string;
    name: string;
    slug: string;
  }[];
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState("");

  // edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editParentId, setEditParentId] = useState("");

  const disabledCreate = useMemo(() => saving || !name.trim(), [saving, name]);

  async function refresh() {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = (await res.json()) as CategoryRow[];
    setCategories(data);
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const signRes = await fetch("/api/cloudinary/category-sign", {
        method: "POST",
      });
      const signed = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signed.apiKey);
      formData.append("timestamp", String(signed.timestamp));
      formData.append("signature", signed.signature);
      formData.append("folder", signed.folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      const uploaded = await cloudRes.json();
      if (!cloudRes.ok || !uploaded?.secure_url) throw new Error("Error en Cloudinary");
      return uploaded.secure_url;
    } catch (error) {
      console.error(error);
      alert("Error subiendo imagen");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) {
        setSaving(false);
        return;
      }
    }

    try {
      const finalSlug = (slug.trim() || slugify(name)).trim();

      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: finalSlug,
          image: imageUrl,
          parentId: parentId || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo crear");
        return;
      }

      setName("");
      setSlug("");
      setParentId("");
      setImageFile(null);
      setImagePreview(null);

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: CategoryRow) {
    setEditId(c.id);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditParentId(c.parentId ?? "");
    setEditImagePreview(c.image || null);
    setEditImageFile(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditSlug("");
    setEditParentId("");
    setEditImageFile(null);
    setEditImagePreview(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);

    let imageUrl: string | null = editImagePreview;
    if (editImageFile) {
      setEditUploading(true);
      imageUrl = await uploadImage(editImageFile);
      setEditUploading(false);
      if (!imageUrl) {
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug.trim() || slugify(editName),
          image: imageUrl,
          parentId: editParentId || null,
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
    if (!confirm("¿Eliminar categoría? Si tiene productos o subcategorías asociadas, puede fallar.")) return;

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
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-orange/10">
            <Folder className="h-5 w-5 text-conquer-orange" />
          </div>
          <h1 className="text-2xl font-bold text-conquer-navy">Categorías</h1>
        </div>

        <a
          href="/admin/productos"
          className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors"
        >
          <Package className="h-4 w-4" />
          <span className="text-sm">Ir a Productos</span>
        </a>
      </div>

      <div className="bg-white rounded-3xl border border-conquer-pink/30 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-conquer-navy mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-conquer-orange" />
          Nueva categoría
        </h2>

        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Folder className="h-4 w-4" />
                Nombre *
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                placeholder="Ej: Mates y Termos"
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (!slug.trim()) setSlug(slugify(v));
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1 text-sm font-medium text-conquer-navy">
                <Hash className="h-4 w-4" />
                Slug (opcional)
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                placeholder="Ej: mates-y-termos"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-conquer-navy">
                Categoría padre
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
              >
                <option value="">Sin padre</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5">
            <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy mb-3">
              <ImageIcon className="h-4 w-4" />
              Imagen de la categoría (opcional)
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {imagePreview && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-conquer-pink/30">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Eliminar imagen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="flex items-center gap-2 rounded-full bg-conquer-orange px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-conquer-orange/90 transition-colors">
                      <Upload className="h-4 w-4" />
                      Seleccionar archivo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {imageFile && (
                    <span className="text-sm text-neutral-600">{imageFile.name}</span>
                  )}
                </div>

                <p className="text-xs text-neutral-500 mt-2">
                  Imagen recomendada: 400x400px, formato JPG o PNG.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={disabledCreate || uploading}
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg w-full md:w-auto"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Subiendo imagen...
              </>
            ) : saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Crear categoría
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-conquer-pink/30 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-conquer-pink/20 bg-conquer-pink/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-conquer-navy flex items-center gap-2">
              <Package className="h-5 w-5 text-conquer-orange" />
              Categorías existentes
            </h2>
            <span className="text-sm text-neutral-600">
              Total: <span className="font-bold text-conquer-navy">{categories.length}</span>
            </span>
          </div>
        </div>

        <div className="divide-y divide-conquer-pink/20">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No hay categorías creadas todavía.
            </div>
          ) : (
            categories.map((c) => {
              const isEdit = editId === c.id;
              const productCount = c?._count?.products ?? 0;

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-6 hover:bg-conquer-pink/5 transition-colors"
                >
                  {!isEdit ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {c.image ? (
                          <div className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-conquer-pink/30 flex-shrink-0">
                            <Image src={c.image} alt={c.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-xl bg-conquer-pink/10 border-2 border-conquer-pink/30 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-6 w-6 text-conquer-navy/40" />
                          </div>
                        )}

                        <div>
                          <h3 className="text-base font-semibold text-conquer-navy">{c.name}</h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-500">/{c.slug}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-conquer-pink/20 px-3 py-1 text-xs font-medium text-conquer-navy">
                              <Package className="h-3 w-3" />
                              {productCount} {productCount === 1 ? "producto" : "productos"}
                            </span>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-neutral-500">
                              Padre: <b>{c.parent?.name ?? "Sin padre"}</b>
                            </div>

                            {c.children && c.children.length > 0 && (
                              <div className="text-xs text-neutral-500">
                                Hijas: <b>{c.children.map((child) => child.name).join(", ")}</b>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="flex items-center gap-1 h-9 px-4 rounded-full border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(c.id)}
                          disabled={saving}
                          className="flex items-center gap-1 h-9 px-4 rounded-full border border-red-300 text-red-600 hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          className="h-11 rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nombre"
                        />

                        <input
                          className="h-11 rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          placeholder="Slug"
                        />

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium text-conquer-navy">
                            Categoría padre
                          </label>
                          <select
                            value={editParentId}
                            onChange={(e) => setEditParentId(e.target.value)}
                            className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                          >
                            <option value="">Sin padre</option>
                            {categories
                              .filter((cat) => cat.id !== editId)
                              .map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5">
                        <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy mb-3">
                          <ImageIcon className="h-4 w-4" />
                          Imagen de la categoría
                        </label>

                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                          {editImagePreview ? (
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-conquer-pink/30">
                              <Image
                                src={editImagePreview}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditImageFile(null);
                                  setEditImagePreview(null);
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                title="Eliminar imagen"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="h-20 w-20 rounded-xl bg-conquer-pink/10 border-2 border-conquer-pink/30 flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-conquer-navy/40" />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer">
                                <span className="flex items-center gap-2 rounded-full bg-conquer-orange px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-conquer-orange/90 transition-colors">
                                  <Upload className="h-4 w-4" />
                                  {editImagePreview ? "Cambiar imagen" : "Subir imagen"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setEditImageFile(file);
                                      setEditImagePreview(URL.createObjectURL(file));
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {editImageFile && (
                                <span className="text-sm text-neutral-600">{editImageFile.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving || !editName.trim() || editUploading}
                          className="flex items-center gap-2 h-10 px-5 rounded-full bg-conquer-turq text-white font-medium hover:bg-conquer-turq/90 transition-colors disabled:opacity-50"
                        >
                          {editUploading ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Guardar cambios
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex items-center gap-1 h-10 px-5 rounded-full border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}