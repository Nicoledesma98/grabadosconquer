"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  stock: number | null;
  variants: {
    id: string;
    sku: string;
    colorName: string | null;
    stock: number;
  }[];
};

export default function AdminStockIngresarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [q, setQ] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/products-search-for-link");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "No se pudieron cargar productos");
        }

        setProducts(data.products || []);
      } catch (e: any) {
        setError(e.message || "Error cargando productos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const inProduct =
        p.name.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term);

      const inVariants = p.variants.some(
        (v) =>
          v.sku.toLowerCase().includes(term) ||
          (v.colorName || "").toLowerCase().includes(term)
      );

      return inProduct || inVariants;
    });
  }, [products, q]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    const qty = Number(quantity);

    if (!selectedProductId && !selectedVariantId) {
      setError("Seleccioná un producto o una variante");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      setError("La cantidad debe ser un número entero mayor a 0");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        productId: selectedVariantId ? null : selectedProductId || null,
        variantId: selectedVariantId || null,
        quantity: qty,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/admin/stock/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo ingresar mercadería");
      }

      const newStock = data?.result?.newStock;
      const productName = data?.result?.productName;

      setMessage(
        `Ingreso registrado correctamente ✅ ${productName ? `(${productName})` : ""}${typeof newStock === "number" ? ` · Nuevo stock: ${newStock}` : ""}`
      );

      setQuantity("1");
      setNotes("");

      // refresco simple para ver stock actualizado en la lista local
      const reload = await fetch("/api/admin/products-search-for-link");
      const reloadData = await reload.json();
      if (reload.ok) {
        setProducts(reloadData.products || []);
      }
    } catch (e: any) {
      setError(e.message || "Error guardando ingreso");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-conquer-navy">
            Ingresar mercadería
          </h1>
          <p className="text-sm text-neutral-600">
            Sumá stock propio y registrá el movimiento manualmente
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/stock"
            className="h-10 px-4 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
          >
            ← Volver a stock
          </Link>

          <Link
            href="/admin/stock/movimientos"
            className="h-10 px-4 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
          >
            Ver movimientos
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-conquer-pink bg-white p-4">
          <h2 className="text-lg font-semibold text-conquer-navy mb-4">
            1. Elegí producto o variante
          </h2>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, slug, SKU o color..."
            className="h-11 w-full rounded-2xl border border-conquer-pink px-4 mb-4"
          />

          {loading ? (
            <div className="text-sm text-neutral-500">Cargando productos...</div>
          ) : (
            <div className="max-h-[550px] overflow-auto space-y-3">
              {filteredProducts.map((p) => {
                const isSelectedProduct =
                  selectedProductId === p.id && !selectedVariantId;

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-conquer-pink/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-conquer-navy">
                          {p.name}
                        </div>
                        <div className="text-xs text-neutral-500">{p.slug}</div>
                        <div className="text-xs text-neutral-500">
                          Stock simple: {p.stock ?? 0}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setSelectedVariantId("");
                        }}
                        className={`h-9 px-3 rounded-2xl border text-sm ${
                          isSelectedProduct
                            ? "bg-conquer-orange text-white border-conquer-orange"
                            : "border-conquer-pink hover:bg-conquer-pink/10"
                        }`}
                      >
                        Seleccionar producto
                      </button>
                    </div>

                    {p.variants.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-semibold text-neutral-600">
                          Variantes
                        </div>

                        {p.variants.map((v) => {
                          const isSelectedVariant = selectedVariantId === v.id;

                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-conquer-pink/20 px-3 py-2"
                            >
                              <div className="text-sm">
                                <div className="font-medium text-conquer-navy">
                                  {v.colorName || "Sin color"}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  SKU: {v.sku} · Stock: {v.stock}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setSelectedVariantId(v.id);
                                }}
                                className={`h-8 px-3 rounded-2xl border text-xs ${
                                  isSelectedVariant
                                    ? "bg-conquer-orange text-white border-conquer-orange"
                                    : "border-conquer-pink hover:bg-conquer-pink/10"
                                }`}
                              >
                                Seleccionar variante
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {!loading && filteredProducts.length === 0 && (
                <div className="text-sm text-neutral-500">
                  No se encontraron productos.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-conquer-pink bg-white p-4">
          <h2 className="text-lg font-semibold text-conquer-navy mb-4">
            2. Datos del ingreso
          </h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-conquer-navy mb-1">
                Cantidad a ingresar *
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11 w-full rounded-2xl border border-conquer-pink px-4"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-conquer-navy mb-1">
                Observaciones
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-2xl border border-conquer-pink px-4 py-3"
                placeholder="Ej: Ingreso de mercadería, ajuste de stock, recepción proveedor..."
              />
            </div>

            <div className="rounded-2xl bg-conquer-pink/10 p-3 text-sm">
              <div className="font-medium text-conquer-navy mb-1">
                Selección actual
              </div>

              {selectedVariantId ? (
                <div className="text-neutral-700">
                  Variante seleccionada del producto{" "}
                  <span className="font-semibold">
                    {selectedProduct?.name || "-"}
                  </span>
                </div>
              ) : selectedProductId ? (
                <div className="text-neutral-700">
                  Producto seleccionado:{" "}
                  <span className="font-semibold">
                    {selectedProduct?.name || "-"}
                  </span>
                </div>
              ) : (
                <div className="text-neutral-500">
                  Todavía no seleccionaste nada
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Registrar ingreso"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}