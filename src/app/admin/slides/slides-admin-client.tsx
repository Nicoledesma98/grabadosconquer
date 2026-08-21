"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  Plus,
  Edit,
  Trash2,
  Save,
  Images,
  Package,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";

type SlideRow = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  order: number;
  active: boolean;
  primaryLabel: string | null;
  primaryUrl: string | null;
  secondaryLabel: string | null;
  secondaryUrl: string | null;
};

const DEFAULT_PRIMARY_LABEL = "Ver productos";
const DEFAULT_PRIMARY_URL = "/productos";
const DEFAULT_SECONDARY_LABEL = "Consultar";
const DEFAULT_SECONDARY_URL = "https://wa.me/541131002011";

async function uploadImage(file: File): Promise<string | null> {
  try {
    const signRes = await fetch("/api/cloudinary/slide-sign", { method: "POST" });
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
  }
}

export default function SlidesAdminClient({
  initialSlides,
}: {
  initialSlides: SlideRow[];
}) {
  const [slides, setSlides] = useState<SlideRow[]>(initialSlides);

  // crear
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primaryLabel, setPrimaryLabel] = useState(DEFAULT_PRIMARY_LABEL);
  const [primaryUrl, setPrimaryUrl] = useState(DEFAULT_PRIMARY_URL);
  const [secondaryLabel, setSecondaryLabel] = useState(DEFAULT_SECONDARY_LABEL);
  const [secondaryUrl, setSecondaryUrl] = useState(DEFAULT_SECONDARY_URL);

  // edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [editPrimaryLabel, setEditPrimaryLabel] = useState("");
  const [editPrimaryUrl, setEditPrimaryUrl] = useState("");
  const [editSecondaryLabel, setEditSecondaryLabel] = useState("");
  const [editSecondaryUrl, setEditSecondaryUrl] = useState("");

  const disabledCreate = saving || !title.trim() || !imageFile;

  async function refresh() {
    const res = await fetch("/api/admin/slides", { cache: "no-store" });
    const data = (await res.json()) as SlideRow[];
    setSlides(data);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) return alert("Elegí una imagen");
    setSaving(true);
    setUploading(true);

    const imageUrl = await uploadImage(imageFile);
    setUploading(false);

    if (!imageUrl) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          primaryLabel: primaryLabel.trim() || null,
          primaryUrl: primaryUrl.trim() || null,
          secondaryLabel: secondaryLabel.trim() || null,
          secondaryUrl: secondaryUrl.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo crear");
        return;
      }

      setTitle("");
      setSubtitle("");
      setImageFile(null);
      setImagePreview(null);
      setPrimaryLabel(DEFAULT_PRIMARY_LABEL);
      setPrimaryUrl(DEFAULT_PRIMARY_URL);
      setSecondaryLabel(DEFAULT_SECONDARY_LABEL);
      setSecondaryUrl(DEFAULT_SECONDARY_URL);

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: SlideRow) {
    setEditId(s.id);
    setEditTitle(s.title);
    setEditSubtitle(s.subtitle ?? "");
    setEditImagePreview(s.imageUrl);
    setEditImageFile(null);
    setEditPrimaryLabel(s.primaryLabel ?? DEFAULT_PRIMARY_LABEL);
    setEditPrimaryUrl(s.primaryUrl ?? DEFAULT_PRIMARY_URL);
    setEditSecondaryLabel(s.secondaryLabel ?? DEFAULT_SECONDARY_LABEL);
    setEditSecondaryUrl(s.secondaryUrl ?? DEFAULT_SECONDARY_URL);
  }

  function cancelEdit() {
    setEditId(null);
    setEditTitle("");
    setEditSubtitle("");
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditPrimaryLabel("");
    setEditPrimaryUrl("");
    setEditSecondaryLabel("");
    setEditSecondaryUrl("");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);

    let imageUrl = editImagePreview;
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
      const res = await fetch(`/api/admin/slides/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          subtitle: editSubtitle.trim() || null,
          imageUrl,
          primaryLabel: editPrimaryLabel.trim() || null,
          primaryUrl: editPrimaryUrl.trim() || null,
          secondaryLabel: editSecondaryLabel.trim() || null,
          secondaryUrl: editSecondaryUrl.trim() || null,
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

  async function toggleActive(s: SlideRow) {
    const res = await fetch(`/api/admin/slides/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    if (res.ok) await refresh();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;

    const a = slides[index];
    const b = slides[target];

    await Promise.all([
      fetch(`/api/admin/slides/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/admin/slides/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);

    await refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("¿Eliminar este slide?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/slides/${id}`, { method: "DELETE" });
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
            <Images className="h-5 w-5 text-conquer-orange" />
          </div>
          <h1 className="text-2xl font-bold text-conquer-navy">
            Carrousel de inicio
          </h1>
        </div>

        <a
          href="/"
          target="_blank"
          className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors"
        >
          <Package className="h-4 w-4" />
          <span className="text-sm">Ver inicio</span>
        </a>
      </div>

      <div className="bg-white rounded-3xl border border-conquer-pink/30 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-conquer-navy mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-conquer-orange" />
          Nuevo slide
        </h2>

        <form onSubmit={onCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-conquer-navy">Título *</label>
              <input
                className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                placeholder="Ej: Bolígrafos personalizados"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-conquer-navy">
                Subtítulo (opcional)
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                placeholder="Ej: Ideal para empresas y eventos"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
          </div>

          <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5 space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy">
              <LinkIcon className="h-4 w-4" />
              Botones del slide
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-600">
                  Botón 1 · texto
                </label>
                <input
                  className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                  value={primaryLabel}
                  onChange={(e) => setPrimaryLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-600">
                  Botón 1 · adónde va
                </label>
                <input
                  className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                  placeholder="/productos ó https://..."
                  value={primaryUrl}
                  onChange={(e) => setPrimaryUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-600">
                  Botón 2 · texto
                </label>
                <input
                  className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                  value={secondaryLabel}
                  onChange={(e) => setSecondaryLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-600">
                  Botón 2 · adónde va
                </label>
                <input
                  className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                  placeholder="/productos ó https://..."
                  value={secondaryUrl}
                  onChange={(e) => setSecondaryUrl(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              Podés usar una ruta interna (ej: /productos?cat=mates) o un link completo (ej: https://wa.me/...). Dejalos como están si no querés cambiarlos.
            </p>
          </div>

          <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5">
            <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy mb-3">
              <Images className="h-4 w-4" />
              Imagen del slide *
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {imagePreview && (
                <div className="relative w-40 aspect-[21/9] rounded-xl overflow-hidden border-2 border-conquer-pink/30">
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
                  Imagen recomendada: formato panorámico (ej. 2100x900px), JPG o PNG.
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
                Crear slide
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-conquer-pink/30 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-conquer-pink/20 bg-conquer-pink/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-conquer-navy flex items-center gap-2">
              <Images className="h-5 w-5 text-conquer-orange" />
              Slides existentes
            </h2>
            <span className="text-sm text-neutral-600">
              Total: <span className="font-bold text-conquer-navy">{slides.length}</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            El orden acá define el orden en el carrousel. Los inactivos no se muestran en la web.
          </p>
        </div>

        <div className="divide-y divide-conquer-pink/20">
          {slides.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No hay slides creados todavía. Mientras tanto se muestran los 3 de siempre.
            </div>
          ) : (
            slides.map((s, index) => {
              const isEdit = editId === s.id;

              return (
                <div
                  key={s.id}
                  className="p-4 sm:p-6 hover:bg-conquer-pink/5 transition-colors"
                >
                  {!isEdit ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            disabled={index === 0}
                            className="rounded-full p-1 text-conquer-navy/60 hover:bg-conquer-pink/10 disabled:opacity-30"
                            title="Subir"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            disabled={index === slides.length - 1}
                            className="rounded-full p-1 text-conquer-navy/60 hover:bg-conquer-pink/10 disabled:opacity-30"
                            title="Bajar"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="relative h-14 w-28 rounded-xl overflow-hidden border-2 border-conquer-pink/30 flex-shrink-0">
                          <Image src={s.imageUrl} alt={s.title} fill className="object-cover" />
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-conquer-navy">
                            {s.title}
                          </h3>
                          {s.subtitle && (
                            <p className="text-sm text-neutral-500">{s.subtitle}</p>
                          )}
                          <span
                            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.active
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {s.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleActive(s)}
                          className="flex items-center gap-1 h-9 px-4 rounded-full border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors text-sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {s.active ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="flex items-center gap-1 h-9 px-4 rounded-full border border-conquer-pink/30 text-conquer-navy hover:bg-conquer-pink/10 transition-colors text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(s.id)}
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
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título"
                        />

                        <input
                          className="h-11 rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                          value={editSubtitle}
                          onChange={(e) => setEditSubtitle(e.target.value)}
                          placeholder="Subtítulo (opcional)"
                        />
                      </div>

                      <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5 space-y-4">
                        <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy">
                          <LinkIcon className="h-4 w-4" />
                          Botones del slide
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-600">
                              Botón 1 · texto
                            </label>
                            <input
                              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                              value={editPrimaryLabel}
                              onChange={(e) => setEditPrimaryLabel(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-600">
                              Botón 1 · adónde va
                            </label>
                            <input
                              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                              value={editPrimaryUrl}
                              onChange={(e) => setEditPrimaryUrl(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-600">
                              Botón 2 · texto
                            </label>
                            <input
                              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                              value={editSecondaryLabel}
                              onChange={(e) => setEditSecondaryLabel(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-600">
                              Botón 2 · adónde va
                            </label>
                            <input
                              className="h-11 w-full rounded-2xl border border-conquer-pink/30 px-4 outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                              value={editSecondaryUrl}
                              onChange={(e) => setEditSecondaryUrl(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border border-conquer-pink/30 rounded-2xl p-4 bg-conquer-pink/5">
                        <label className="flex items-center gap-2 text-sm font-medium text-conquer-navy mb-3">
                          <Images className="h-4 w-4" />
                          Imagen del slide
                        </label>

                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                          {editImagePreview && (
                            <div className="relative w-40 aspect-[21/9] rounded-xl overflow-hidden border-2 border-conquer-pink/30">
                              <Image
                                src={editImagePreview}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer">
                                <span className="flex items-center gap-2 rounded-full bg-conquer-orange px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-conquer-orange/90 transition-colors">
                                  <Upload className="h-4 w-4" />
                                  Cambiar imagen
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
                                <span className="text-sm text-neutral-600">
                                  {editImageFile.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving || !editTitle.trim() || editUploading}
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
