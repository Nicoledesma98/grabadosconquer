"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { unitPriceForQty, type PriceTier } from "@/lib/pricing";
import PersonalizationMethod from "@prisma/client";

type VariantDTO = {
  id: string;
  sku: string;
  colorName: string;
  colorHex?: string | null;
  stock: number;
  priceOverride?: number | null;
};
type PersonalizationMethod = "DTF" | "DTG" | "FULL_COLOR" | "LASER";
type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  images: { url: string; alt: string | null }[];
  priceTiers: PriceTier[];
  categories?: { id: string; name: string; slug: string }[];
  variants?: VariantDTO[];
  allowedMethods?: PersonalizationMethod[];
};


function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductDetailClient({ product }: { product: ProductDTO }) {
  const [qty, setQty] = useState(1);
  const [addedMsg, setAddedMsg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const addItem = useCart((s) => s.addItem);
  const allowed = product.allowedMethods ?? [];
  const [method, setMethod] = useState<PersonalizationMethod | null>(allowed[0] ?? null)
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const imgs = product.images?.length ? product.images : [];
  const activeImg = imgs[activeIdx]?.url ?? null;

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  }, [variants, variantId]);

  const baseForPricing = selectedVariant?.priceOverride ?? product.basePrice;
  const stock = selectedVariant?.stock ?? null;
  const unitPrice = useMemo(
    () => unitPriceForQty(product.priceTiers ?? [], baseForPricing, qty),
    [product.priceTiers, baseForPricing, qty]
  );

  const total = unitPrice * qty;

  const nextTier = useMemo(() => {
    const tiers = [...(product.priceTiers ?? [])].sort((a, b) => a.minQty - b.minQty);
    return tiers.find((t) => t.minQty > qty) ?? null;
  }, [product.priceTiers, qty]);


  const currentTier = useMemo(() => {
    const tiers = [...(product.priceTiers ?? [])].sort((a, b) => a.minQty - b.minQty);
    let cur: PriceTier | null = null;
    for (const t of tiers) if (qty >= t.minQty) cur = t;
    return cur;
  }, [product.priceTiers, qty]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Galería */}
        <section className="grid gap-3">
          <div className="rounded-3xl border border-conquer-pink overflow-hidden bg-white">
            <div className="relative aspect-square bg-conquer-pink/10">
              {activeImg ? (
                <Image
                  src={activeImg}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  priority
                />
              ) : (
                <div className="h-full grid place-items-center text-sm text-neutral-500">
                  Sin imagen
                </div>
              )}
            </div>
          </div>

          {imgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {imgs.map((im, idx) => {
                const on = idx === activeIdx;
                return (
                  <button
                    key={`${im.url}-${idx}`}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`relative h-20 w-20 shrink-0 rounded-2xl border overflow-hidden bg-white ${on ? "border-conquer-orange" : "border-conquer-pink hover:border-conquer-turq"
                      }`}
                    aria-label={`Ver imagen ${idx + 1}`}
                  >
                    <Image src={im.url} alt={im.alt ?? product.name} fill className="object-contain p-2" />
                  </button>
                );
              })}

            </div>
          )}
        </section>

        {/* Info + compra */}
        <section className="grid gap-4">
          {/* Badges categorías */}
          {!!product.categories?.length && (
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center rounded-full bg-conquer-pink/40 px-3 py-1 text-xs font-medium text-conquer-navy"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <div>
            <h1 className="text-3xl font-semibold text-conquer-navy">{product.name}</h1>
            <div className="mt-1 text-xs text-neutral-500">SKU/Slug: {product.slug}</div>

            {product.description ? (
              <p className="mt-3 text-neutral-700 leading-relaxed">{product.description}</p>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Sin descripción</p>
            )}
          </div>
          {/* Variantes (color/sku/stock) */}
          {variants.length > 0 && (
            <div className="rounded-3xl border border-conquer-pink bg-white p-4">
              <div className="text-sm font-semibold text-conquer-navy">Color</div>

              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const on = v.id === (selectedVariant?.id ?? "");
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${on
                        ? "border-conquer-orange bg-conquer-pink/20"
                        : "border-conquer-pink hover:border-conquer-turq"
                        }`}
                      title={v.sku}
                    >
                      <span
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: v.colorHex ?? "#fff" }}
                      />
                      <span className="font-medium text-conquer-navy">{v.colorName}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-neutral-600">
                SKU: <b>{selectedVariant?.sku ?? "-"}</b>
                {typeof stock === "number" && (
                  <>
                    {" "}— Stock:{" "}
                    <b className={stock > 0 ? "text-green-700" : "text-red-700"}>
                      {stock > 0 ? stock : "Sin stock"}
                    </b>
                  </>
                )}
              </div>

              {selectedVariant?.priceOverride != null && (
                <div className="mt-2 text-xs text-neutral-600">
                  Precio base de esta variante: <b>{formatARS(selectedVariant.priceOverride)}</b>
                </div>
              )}
            </div>
          )}
          {allowed.length > 0 && (
            <div className="rounded-3xl border border-conquer-pink bg-white p-4">
              <div className="text-sm font-semibold text-conquer-navy">Personalización</div>

              <div className="mt-3 flex flex-wrap gap-2">
                {allowed.map((m) => {
                  const on = m === method;
                  const label =
                    m === "FULL_COLOR" ? "Full color" :
                      m === "LASER" ? "Láser" :
                        m === "DTF" ? "DTF" : "DTG";

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-medium ${on
                          ? "border-conquer-orange bg-conquer-pink/20 text-conquer-navy"
                          : "border-conquer-pink hover:border-conquer-turq text-neutral-700"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 text-xs text-neutral-600">
                Elegí el método de personalización para este producto.
              </div>
            </div>
          )}


          {/* Caja de precio */}
          <div className="rounded-3xl border border-conquer-pink bg-white p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-neutral-500">Precio unitario</div>
                <div className="text-3xl font-semibold text-conquer-navy">{formatARS(unitPrice)}</div>
                {currentTier && (
                  <div className="mt-1 text-xs text-neutral-500">
                    Aplicado: desde <b>{currentTier.minQty}u</b>
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-sm text-neutral-500">Total</div>
                <div className="text-3xl font-semibold text-conquer-navy">{formatARS(total)}</div>
              </div>
            </div>

            {/* Cantidad */}
            <div className="mt-5 flex items-center gap-3">
              <div className="text-sm text-neutral-600">Cantidad</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-conquer-pink hover:bg-conquer-pink/20"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  -
                </button>

                <input
                  className="h-10 w-24 rounded-xl border border-conquer-pink text-center"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                  inputMode="numeric"
                />

                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-conquer-pink hover:bg-conquer-pink/20"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Progreso al siguiente tier */}
            {nextTier && (
              <div className="mt-4 rounded-2xl bg-conquer-pink/25 p-3 text-sm text-conquer-navy">
                Te faltan <b>{nextTier.minQty - qty}u</b> para pagar{" "}
                <b>{formatARS(nextTier.price)}</b> c/u.
              </div>
            )}

            {/* Tabla tiers */}
            {(product.priceTiers?.length ?? 0) > 0 && (
              <div className="mt-5">
                <div className="text-sm font-semibold text-conquer-navy">Precios por cantidad</div>
                <div className="mt-2 grid gap-2">
                  {[...(product.priceTiers ?? [])]
                    .sort((a, b) => a.minQty - b.minQty)
                    .map((t) => {
                      const on = qty >= t.minQty;
                      return (
                        <div
                          key={t.minQty}
                          className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm border ${on
                            ? "border-conquer-turq bg-conquer-turq/10"
                            : "border-conquer-pink bg-white"
                            }`}
                        >
                          <span>Desde {t.minQty}u</span>
                          <span className="font-semibold">{formatARS(t.price)} c/u</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              disabled={typeof stock === "number" ? stock <= 0 : false}
              className="mt-6 w-full h-12 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50"
              onClick={() => {
                addItem(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    imageUrl: activeImg ?? null,
                    unitPrice,
                    method,

                    // ✅ extra (no rompe si tu store lo ignora, pero ideal agregarlo al tipo del carrito)
                    variantId: selectedVariant?.id ?? null,
                    variantSku: selectedVariant?.sku ?? null,
                    variantName: selectedVariant?.colorName ?? null,
                  } as any,
                  qty
                );
                setAddedMsg(true);
                setTimeout(() => setAddedMsg(false), 1200);
              }}
            >
              {typeof stock === "number" && stock <= 0
                ? "Sin stock"
                : addedMsg
                  ? "Agregado ✅"
                  : "Agregar al carrito"}
            </button>


            <div className="mt-3 text-xs text-neutral-500">
              ¿Dudas? Consultá por WhatsApp: <b>11 3100 2011</b>
            </div>
          </div>

          {/* Bloque confianza */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-conquer-pink bg-white p-4">
              <div className="text-sm font-semibold text-conquer-navy">Envíos</div>
              <div className="mt-1 text-sm text-neutral-600">OCA / Moto / Retiro</div>
            </div>
            <div className="rounded-3xl border border-conquer-pink bg-white p-4">
              <div className="text-sm font-semibold text-conquer-navy">Personalización</div>
              <div className="mt-1 text-sm text-neutral-600">Grabado láser y UV</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
