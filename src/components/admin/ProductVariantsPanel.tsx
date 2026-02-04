"use client";

import { useEffect, useState } from "react";
import NFSyncButton from "./NFSyncButton";

type Variant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string | null;
  stock: number;
  priceOverride: number | null;
};

export default function ProductVariantsPanel({ productId }: { productId: string }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);

  const [sku, setSku] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [stock, setStock] = useState("0");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, { cache: "no-store" });
      const data = await res.json();
      setVariants(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function createVariant() {
    const res = await fetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, colorName, colorHex: colorHex || null, stock }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return alert(payload?.error || "No se pudo crear variante");

    setSku("");
    setColorName("");
    setColorHex("");
    setStock("0");
    await load();
  }

  async function updateVariant(id: string, patch: Partial<Variant>) {
    const res = await fetch(`/api/admin/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return alert(payload?.error || "No se pudo guardar");
    await load();
  }

  async function deleteVariant(id: string) {
    if (!confirm("¿Eliminar esta variante?")) return;
    const res = await fetch(`/api/admin/variants/${id}`, { method: "DELETE" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return alert(payload?.error || "No se pudo borrar");
    await load();
  }

  return (
    <section className="rounded-2xl border p-5">
      <div className="text-lg font-semibold">Variantes (color / SKU / stock)</div>
      <div className="text-sm text-neutral-600 mt-1">
        Cada color = SKU distinto + stock distinto.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="SKU (obligatorio)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="Color (obligatorio)"
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
        />
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="#HEX (opcional)"
          value={colorHex}
          onChange={(e) => setColorHex(e.target.value)}
        />
        <input
          className="h-11 rounded-2xl border px-4"
          placeholder="Stock"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          inputMode="numeric"
        />
      </div>

      <button
        type="button"
        onClick={createVariant}
        className="mt-3 h-11 rounded-2xl bg-black text-white px-4 hover:opacity-90"
        disabled={!sku.trim() || !colorName.trim()}
      >
        Crear variante
      </button>
      <NFSyncButton/>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-neutral-600">Cargando variantes...</div>
        ) : variants.length === 0 ? (
          <div className="text-sm text-neutral-600">No hay variantes todavía.</div>
        ) : (
          <div className="grid gap-2">
            {variants.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-2xl border p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 rounded-full border"
                    style={{ background: v.colorHex ?? "#fff" }}
                    title={v.colorHex ?? ""}
                  />
                  <div className="font-medium">{v.colorName}</div>
                </div>

                <input
                  className="h-10 rounded-xl border px-3 text-sm"
                  defaultValue={v.sku}
                  onBlur={(e) => updateVariant(v.id, { sku: e.target.value })}
                />
                <input
                  className="h-10 w-28 rounded-xl border px-3 text-sm"
                  defaultValue={String(v.stock)}
                  onBlur={(e) => updateVariant(v.id, { stock: Number(e.target.value) })}
                />

                <button
                  type="button"
                  onClick={() => deleteVariant(v.id)}
                  className="ml-auto rounded-xl border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
