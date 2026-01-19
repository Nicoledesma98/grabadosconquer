"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { unitPriceForQty, type PriceTier } from "@/lib/pricing";


type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePrice: number | null;
  images: { url: string; alt: string | null }[];
  priceTiers: PriceTier[];
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
  const addItem = useCart((s) => s.addItem);
  const [imgIndex, setImgIndex] = useState(0);

  const unitPrice = useMemo(
    () => unitPriceForQty(product.priceTiers, product.basePrice, qty),
    [product.priceTiers, product.basePrice, qty]
  );

  const total = unitPrice * qty;
  const images = product.images ?? [];
  const safeIndex = Math.min(imgIndex, Math.max(0, images.length - 1));
  const mainImg = images[safeIndex]?.url ?? images[0]?.url ?? null;

  return (
    <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
      <div className="rounded-2xl border p-3">
        <div className="rounded-2xl overflow-hidden bg-neutral-50">
          <div className="aspect-square flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {mainImg ? (
              <img src={mainImg} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-neutral-500 text-sm">Sin imagen</span>
            )}
          </div>
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, idx) => {
              const active = (img.url ?? "") === (mainImg ?? "");
              return (
                <button
                  key={img.url + idx}
                  type="button"
                  onClick={() => setImgIndex(idx)}
                  className={`h-16 w-16 rounded-xl border overflow-hidden flex-shrink-0 ${active ? "ring-2 ring-black" : "hover:bg-neutral-50"
                    }`}
                  title={img.alt ?? product.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt ?? product.name} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>


      <div>
        <h1 className="text-3xl font-semibold">{product.name}</h1>

        {product.description ? (
          <p className="mt-3 text-neutral-700">{product.description}</p>
        ) : (
          <p className="mt-3 text-neutral-500 text-sm">Sin descripción</p>
        )}

        <div className="mt-6 rounded-2xl border p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500">Precio unitario</div>
              <div className="text-2xl font-semibold">{formatARS(unitPrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-500">Total</div>
              <div className="text-2xl font-semibold">{formatARS(total)}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm text-neutral-600">Cantidad</label>
            <div className="flex items-center gap-2">
              <button
                className="h-10 w-10 rounded-xl border hover:bg-neutral-50"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                -
              </button>

              <input
                className="h-10 w-20 rounded-xl border text-center"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                inputMode="numeric"
              />

              <button
                className="h-10 w-10 rounded-xl border hover:bg-neutral-50"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          {product.priceTiers.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-medium">Precios por cantidad</div>
              <div className="mt-2 grid gap-2">
                {product.priceTiers.map((t) => (
                  <div
                    key={t.minQty}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span>Desde {t.minQty}u</span>
                    <span className="font-medium">{formatARS(t.price)} c/u</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="mt-6 w-full h-11 rounded-2xl bg-black text-white hover:opacity-90"
            onClick={() => {
              addItem(
                {
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  imageUrl: mainImg ?? null,
                  unitPrice,
                },
                qty
              );
              setAddedMsg(true);
              setTimeout(() => setAddedMsg(false), 1200);
            }}
          >
            {addedMsg ? "Agregado ✅" : "Agregar al carrito"}
          </button>

        </div>
      </div>
    </div>
  );
}
