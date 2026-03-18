"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { unitPriceForQty, type PriceTier } from "@/lib/pricing";
import {
  Tag,
  Folder,
  SwatchBook,
  Circle,
  Brush,
  Sparkles,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle,
  LoaderCircle,
  Truck,
  Home,
  Bike,
  Shield,
  Clock,
  CreditCard,
  MessageCircle
} from "lucide-react";

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
  minQtyStep?: number | null;
};

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductDetailClient({ product }: { product: ProductDTO }) {
  const step = Math.max(1, Number(product.minQtyStep ?? 1));
  const [qty, setQty] = useState(step);
  const [addedMsg, setAddedMsg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const addItem = useCart((s) => s.addItem);
  const allowed = product.allowedMethods ?? [];
  const [method, setMethod] = useState<PersonalizationMethod | null>(allowed[0] ?? null);
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

  useEffect(() => {
    setQty((q) => {
      const n = Number.isFinite(q) ? q : step;
      return Math.max(step, Math.round(n / step) * step);
    });
  }, [step]);

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

  const handleAddToCart = () => {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: activeImg ?? null,
        unitPrice,
        method,
        minQtyStep: step,
        variantId: selectedVariant?.id ?? null,
        variantSku: selectedVariant?.sku ?? null,
        variantName: selectedVariant?.colorName ?? null,
      } as any,
      qty
    );
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 1500);
  };

  const stockStatus =
    stock === null ? null : stock > 0 ? (
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle className="w-4 h-4" /> Stock disponible
      </span>
    ) : (
      <span className="flex items-center gap-1 text-red-600">
        <Package className="w-4 h-4" /> Sin stock
      </span>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* ========== COLUMNA IZQUIERDA - GALERÍA ========== */}
        <section className="space-y-4">
          {/* Imagen principal */}
          <div className="group relative aspect-square overflow-hidden rounded-3xl border-2 border-conquer-pink bg-gradient-to-br from-white to-conquer-pink/10 shadow-md transition-shadow hover:shadow-lg">
            <div className="absolute inset-0 bg-conquer-pink/5 opacity-0 transition-opacity group-hover:opacity-100" />
            {activeImg ? (
              <Image
                src={activeImg}
                alt={product.name}
                fill
                className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                priority
              />
            ) : (
              <div className="grid h-full place-items-center text-neutral-400">
                <Package className="h-16 w-16" />
                <span className="mt-2 text-sm">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Miniaturas */}
          {imgs.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {imgs.map((img, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={`${img.url}-${idx}`}
                    onClick={() => setActiveIdx(idx)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      isActive
                        ? "border-conquer-orange shadow-md"
                        : "border-conquer-pink/30 hover:border-conquer-turq hover:shadow-sm"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? `Vista ${idx + 1}`}
                      fill
                      className="object-contain p-2"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ========== COLUMNA DERECHA - INFORMACIÓN ========== */}
        <section className="space-y-5">
          {/* Categorías */}
          {!!product.categories?.length && (
            <div className="flex flex-wrap items-center gap-2">
              <Folder className="h-5 w-5 text-conquer-navy" />
              {product.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center rounded-full bg-conquer-pink/20 px-4 py-1.5 text-xs font-medium text-conquer-navy ring-1 ring-conquer-pink/30"
                >
                  <Tag className="mr-1.5 h-3.5 w-3.5" />
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Título y descripción */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-conquer-navy lg:text-4xl">{product.name}</h1>
            <p className="text-xs text-neutral-500">SKU: {product.slug}</p>
            {product.description ? (
              <p className="mt-2 text-base leading-relaxed text-neutral-700">
                {product.description}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-neutral-400">
                Sin descripción disponible
              </p>
            )}
          </div>

          {/* Variantes (colores) */}
          {variants.length > 0 && (
  <div className="rounded-3xl border border-conquer-pink bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-center gap-2 border-b border-conquer-pink/20 pb-3">
      <SwatchBook className="h-5 w-5 text-conquer-navy" />
      <h3 className="font-semibold text-conquer-navy">Colores disponibles</h3>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {variants.map((v) => {
        const isSelected = v.id === selectedVariant?.id;
        const hasStock = v.stock > 0;
        return (
          <button
            key={v.id}
            onClick={() => setVariantId(v.id)}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 transition-all ${
              isSelected
                ? "border-conquer-orange bg-conquer-pink/20 shadow-sm"
                : "border-conquer-pink/30 hover:border-conquer-turq hover:bg-conquer-pink/10"
            } ${!hasStock ? 'opacity-50' : ''}`}
            disabled={!hasStock} // opcional: deshabilitar si no hay stock
          >
            <Circle
              className="h-5 w-5"
              style={{ fill: v.colorHex ?? "#fff", color: v.colorHex ?? "#fff" }}
            />
            <span className="text-sm font-medium text-conquer-navy">
              {v.colorName}
            </span>
            {/* Indicador de stock */}
            <span className={`text-xs font-medium ml-1 ${
              hasStock ? 'text-green-600' : 'text-red-500'
            }`}>
              {hasStock ? `(${v.stock} u.)` : '(agotado)'}
            </span>
          </button>
        );
      })}
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-1 text-neutral-600">
        <Package className="h-4 w-4" />
        SKU: <span className="font-mono">{selectedVariant?.sku ?? "-"}</span>
      </div>
      {stockStatus}
    </div>
    {selectedVariant?.priceOverride != null && (
      <div className="mt-3 rounded-xl bg-conquer-pink/10 p-2 text-xs text-conquer-navy">
        Precio especial de esta variante:{" "}
        <span className="font-bold">{formatARS(selectedVariant.priceOverride)}</span> c/u
      </div>
    )}
  </div>
)}
          {/* Personalización */}
          {allowed.length > 0 && (
            <div className="rounded-3xl border border-conquer-pink bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 border-b border-conquer-pink/20 pb-3">
                <Brush className="h-5 w-5 text-conquer-navy" />
                <h3 className="font-semibold text-conquer-navy">Personalización</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {allowed.map((m) => {
                  const isSelected = m === method;
                  const labels = {
                    DTF: "DTF",
                    DTG: "DTG",
                    FULL_COLOR: "Full color",
                    LASER: "Láser",
                  };
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-conquer-orange bg-conquer-pink/20 text-conquer-navy shadow-sm"
                          : "border-conquer-pink/30 hover:border-conquer-turq hover:bg-conquer-pink/10"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {labels[m] || m}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Seleccioná el método de personalización para este producto.
              </p>
            </div>
          )}

          {/* Caja de precios y cantidad */}
          <div className="rounded-3xl border-2 border-conquer-pink bg-gradient-to-br from-white to-conquer-pink/5 p-6 shadow-lg">
            {/* Precios */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-medium text-neutral-500">Precio unitario</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-conquer-navy">
                    {formatARS(unitPrice)}
                  </span>
                  {currentTier && (
                    <span className="rounded-full bg-conquer-turq/20 px-2 py-1 text-xs font-medium text-conquer-navy">
                      {currentTier.minQty}+
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-neutral-500">Total</span>
                <div className="mt-1 text-2xl font-bold text-conquer-orange lg:text-3xl">
                  {formatARS(total)}
                </div>
              </div>
            </div>

            {/* Cantidad */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm font-medium text-neutral-600">
                  <Package className="h-4 w-4" />
                  Cantidad
                </span>
                <div className="flex items-center overflow-hidden rounded-xl border-2 border-conquer-pink/50 bg-white">
                  <button
                    onClick={() => setQty((q) => Math.max(step, q - step))}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-conquer-pink/20 disabled:opacity-50"
                    disabled={qty <= step}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    className="h-10 w-20 border-x-2 border-conquer-pink/30 text-center font-medium outline-none"
                    value={qty}
                    min={step}
                    step={step}
                    onChange={(e) => {
                      const raw = Number(e.target.value || step);
                      const safe = Number.isFinite(raw) ? raw : step;
                      const rounded = Math.max(step, Math.round(safe / step) * step);
                      setQty(rounded);
                    }}
                  />
                  <button
                    onClick={() => setQty((q) => q + step)}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-conquer-pink/20"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {step > 1 && (
                <div className="flex items-center gap-1 rounded-full bg-conquer-pink/20 px-3 py-1.5 text-xs text-conquer-navy">
                  <Package className="h-3.5 w-3.5" />
                  Múltiplos de <span className="font-bold">{step}</span>
                </div>
              )}
            </div>

            {/* Próximo descuento */}
            {nextTier && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <span className="font-medium">¡Ahorrá más!</span> Te faltan{" "}
                <span className="font-bold">{nextTier.minQty - qty} unidades</span> para pagar{" "}
                <span className="font-bold">{formatARS(nextTier.price)}</span> c/u.
              </div>
            )}

            {/* Tabla de precios por volumen */}
            {(product.priceTiers?.length ?? 0) > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                  <Tag className="h-4 w-4" />
                  Precios por volumen
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[...(product.priceTiers ?? [])]
                    .sort((a, b) => a.minQty - b.minQty)
                    .map((tier) => {
                      const isActive = qty >= tier.minQty;
                      return (
                        <div
                          key={tier.minQty}
                          className={`rounded-xl border-2 p-2 text-center transition-all ${
                            isActive
                              ? "border-conquer-turq bg-conquer-turq/10 shadow-sm"
                              : "border-conquer-pink/30 bg-white opacity-70"
                          }`}
                        >
                          <div className="text-xs font-medium text-neutral-500">
                            desde {tier.minQty}u
                          </div>
                          <div className="text-base font-bold text-conquer-navy">
                            {formatARS(tier.price)}
                          </div>
                          <div className="text-[10px] text-neutral-400">c/u</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Botón agregar al carrito */}
            <button
              type="button"
              disabled={typeof stock === "number" ? stock <= 0 : false}
              onClick={handleAddToCart}
              className={`mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white transition-all ${
                addedMsg
                  ? "scale-105 bg-green-600 shadow-lg"
                  : "bg-conquer-orange hover:scale-[1.02] hover:shadow-xl"
              } disabled:bg-neutral-400 disabled:hover:scale-100 disabled:hover:shadow-none`}
            >
              {addedMsg ? (
                <>
                  <CheckCircle className="h-5 w-5 animate-pulse" />
                  Agregado
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  {typeof stock === "number" && stock <= 0 ? "Sin stock" : "Agregar al carrito"}
                </>
              )}
            </button>

            {/* WhatsApp de consulta */}
            <div className="mt-4 flex items-center justify-center gap-1 text-xs text-neutral-500">
              <span>¿Consultas?</span>
              <a
                href="https://wa.me/541131002011"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-conquer-navy underline hover:text-conquer-orange"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp 11 3100 2011
              </a>
            </div>
          </div>

          {/* Bloque de confianza */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-2xl border border-conquer-pink/40 bg-white p-4 shadow-sm">
              <Truck className="h-6 w-6 text-conquer-navy" />
              <div>
                <h4 className="text-sm font-semibold text-conquer-navy">Envíos</h4>
                <p className="text-xs text-neutral-600">OCA · Moto · Retiro</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-conquer-pink/40 bg-white p-4 shadow-sm">
              <Shield className="h-6 w-6 text-conquer-navy" />
              <div>
                <h4 className="text-sm font-semibold text-conquer-navy">Pagos seguros</h4>
                <p className="text-xs text-neutral-600">Transferencia · MercadoPago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-conquer-pink/40 bg-white p-4 shadow-sm">
              <Clock className="h-6 w-6 text-conquer-navy" />
              <div>
                <h4 className="text-sm font-semibold text-conquer-navy">Atención</h4>
                <p className="text-xs text-neutral-600">Lun a Vie 9–18hs</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}