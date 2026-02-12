"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useCart } from "@/store/cart";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Package,
  Tag,
  Sparkles,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const VAT_RATE = 0.21;

export default function CarritoPage() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const setQty = useCart((s) => s.setQty);
  const subtotalNet = useCart((s) => s.subtotal());

  const vatAmount = useMemo(() => Math.round(subtotalNet * VAT_RATE), [subtotalNet]);
  const totalWithVat = useMemo(() => subtotalNet + vatAmount, [subtotalNet, vatAmount]);

  // Si el carrito está vacío
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-conquer-pink/30 bg-white p-12 text-center shadow-sm">
          <ShoppingCart className="h-16 w-16 text-conquer-pink/40" />
          <h2 className="mt-4 text-xl font-bold text-conquer-navy">Tu carrito está vacío</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Agregá productos para comenzar tu compra.
          </p>
          <Link
            href="/productos"
            className="mt-6 flex items-center gap-2 rounded-full bg-conquer-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-xl"
          >
            <ShoppingBag className="h-4 w-4" />
            Ver productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Cabecera */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-conquer-orange/10">
            <ShoppingCart className="h-5 w-5 text-conquer-orange" />
          </div>
          <h1 className="text-2xl font-bold text-conquer-navy">Carrito</h1>
          <span className="rounded-full bg-conquer-pink/20 px-3 py-1 text-xs font-medium text-conquer-navy">
            {items.length} {items.length === 1 ? "producto" : "productos"}
          </span>
        </div>
        <Link
          href="/productos"
          className="group flex items-center gap-1 text-sm font-medium text-conquer-navy transition-colors hover:text-conquer-orange"
        >
          Seguir comprando
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            // Step para cantidad
            const step = Math.max(1, Number((item as any).minQtyStep ?? 1));
            const key = (item as any).key ?? `${item.productId}-${(item as any).variantId ?? "base"}-${(item as any).method ?? ""}`;

            // Stock disponible (si está en el item)
            const stock = (item as any).stock;
            const hasStock = stock === undefined || stock === null || stock > 0;

            return (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-conquer-pink/30 bg-white p-4 transition-all hover:border-conquer-orange hover:shadow-md"
              >
                <div className="flex gap-4">
                  {/* Imagen */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-conquer-pink/10 to-conquer-turq/10">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-8 w-8 text-conquer-pink/40" />
                      </div>
                    )}
                  </div>

                  {/* Detalles */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/productos/${item.slug}`}
                          className="font-semibold text-conquer-navy hover:text-conquer-orange transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>

                        {/* Variante */}
                        {(item as any).variantName && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                            <Tag className="h-3 w-3" />
                            <span>{(item as any).variantName}</span>
                            {(item as any).colorHex && (
                              <span
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: (item as any).colorHex }}
                              />
                            )}
                          </div>
                        )}

                        {/* Método de personalización */}
                        {(item as any).method && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                            <Sparkles className="h-3 w-3" />
                            <span className="font-medium">{(item as any).method}</span>
                          </div>
                        )}
                      </div>

                      {/* Precio unitario */}
                      <div className="text-right">
                        <span className="text-sm text-neutral-500">Unitario</span>
                        <div className="text-lg font-bold text-conquer-orange">
                          {formatARS(item.unitPrice)}
                        </div>
                        <span className="text-[10px] text-neutral-500">+ IVA</span>
                      </div>
                    </div>

                    {/* Stock warning */}
                    {stock !== undefined && stock <= 0 && (
                      <div className="mt-2 flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        Sin stock
                      </div>
                    )}

                    {/* Control de cantidad con step */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-medium text-conquer-navy">
                        Cantidad
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(key, Math.max(step, item.qty - step))}
                          disabled={item.qty <= step}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-colors hover:border-conquer-orange hover:bg-conquer-orange/10 disabled:opacity-50"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="h-4 w-4" />
                        </button>

                        <input
                          className="h-9 w-16 rounded-full border border-conquer-pink/30 text-center font-medium outline-none focus:border-conquer-orange focus:ring-2 focus:ring-conquer-orange/20"
                          value={item.qty}
                          onChange={(e) => {
                            const raw = Number(e.target.value || step);
                            const normalized = Math.max(step, Math.round(raw / step) * step);
                            setQty(key, normalized);
                          }}
                          inputMode="numeric"
                        />

                        <button
                          type="button"
                          onClick={() => setQty(key, item.qty + step)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-conquer-pink/30 bg-white text-conquer-navy transition-colors hover:border-conquer-orange hover:bg-conquer-orange/10"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {step > 1 && (
                        <span className="text-xs text-neutral-500">
                          Múltiplos de {step}
                        </span>
                      )}

                      <button
                        onClick={() => removeItem(key)}
                        className="ml-auto flex items-center gap-1 rounded-full p-2 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Quitar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen de compra */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-conquer-navy">
              <ShoppingCart className="h-5 w-5 text-conquer-orange" />
              Resumen
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Subtotal neto</span>
                <span className="font-semibold text-conquer-navy">
                  {formatARS(subtotalNet)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">IVA (21%)</span>
                <span className="font-semibold text-conquer-navy">
                  {formatARS(vatAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Envío</span>
                <span className="font-semibold text-conquer-navy">A calcular</span>
              </div>
            </div>

            <div className="my-4 border-t border-conquer-pink/20 pt-4">
              <div className="flex justify-between text-lg">
                <span className="font-bold text-conquer-navy">Total</span>
                <span className="font-bold text-conquer-orange">
                  {formatARS(totalWithVat)}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                + IVA incluido • Envío no incluido
              </p>
            </div>

            <Link
              href="/checkout"
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-conquer-orange font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              Finalizar compra
            </Link>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Stock verificado
              </span>
              <span className="flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" />
                Pago seguro
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}