"use client";

import Link from "next/link";
import { useCart } from "@/store/cart";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CarritoPage() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const setQty = useCart((s) => s.setQty);
  const subtotal = useCart((s) => s.subtotal());

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Carrito</h1>
        <Link href="/productos" className="text-sm underline">
          Seguir comprando
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
          Tu carrito está vacío.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {items.map((i) => (
            <div key={(i as any).key ?? `${i.productId}-${(i as any).variantId ?? "base"}`} className="rounded-2xl border p-4 flex gap-4">
              <div className="h-20 w-20 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {i.imageUrl ? (
                  <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-neutral-500">Sin imagen</span>
                )}
              </div>

              <div className="flex-1">
                <div className="font-medium">{i.name}</div>
                {i.variantName && (
                  <div className="mt-1 text-xs text-neutral-600 flex items-center gap-2">
                    <span>Color: <b>{i.variantName}</b></span>
                    {i.colorHex && (
                      <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: i.colorHex }} />
                    )}
                    {i.variantSku && <span className="text-neutral-400">({i.variantSku})</span>}
                  </div>

                )}
                {i.method && (
                  <div className="mt-1 text-xs text-neutral-600">
                    Personalización: <b>{i.method}</b>
                  </div>
                )}
                <div className="text-sm text-neutral-600 mt-1">
                  Unitario: <span className="font-medium">{formatARS(i.unitPrice)}</span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-neutral-600">Cantidad</span>
                  <input
                    className="h-9 w-20 rounded-xl border text-center"
                    value={i.qty}
                    onChange={(e) => setQty(i.key, Math.max(1, Number(e.target.value || 1)))}
                    inputMode="numeric"
                  />

                  <button
                    className="ml-auto text-sm underline text-neutral-700"
                    onClick={() => removeItem(i.key)}
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-neutral-500">Subtotal</div>
                <div className="font-semibold">{formatARS(i.unitPrice * i.qty)}</div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border p-4 flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-xl font-semibold">{formatARS(subtotal)}</span>
            <Link
              href="/checkout"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-white hover:opacity-90"
            >
              Finalizar compra
            </Link>

          </div>
        </div>
      )}
    </main>
  );
}
