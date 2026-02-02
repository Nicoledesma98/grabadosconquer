"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";
import { MOTO_PRICES, MotoZone, getMotoLocalitiesByZone, getMotoFromLocality } from "@/lib/shipping/moto";


function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const VAT_RATE = 0.21;

type ShippingMethod = "PICKUP" | "MOTO" | "OCA" | "VIACARGO";
type PaymentMethod = "MERCADO_PAGO" | "CASH" | "TRANSFER" | "COORDINATE";
type InvoiceType = "A" | "B";


export default function CheckoutPage() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotalNet = useCart((s) => s.subtotal()); // neto
  const clear = useCart((s) => s.clear);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Personalización
  const [customText, setCustomText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Datos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Envío
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");

  const [motoZone, setMotoZone] = useState<MotoZone>("CABA");
  const [motoLocality, setMotoLocality] = useState<string>("");
  const motoData = useMemo(() => getMotoLocalitiesByZone(), []);
  const [shipPostalCode, setShipPostalCode] = useState("");
  const [shipStreet, setShipStreet] = useState("");
  const [shipNumber, setShipNumber] = useState("");
  const [shipApartment, setShipApartment] = useState("");

  // Factura
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("B");
  const [invoiceCuit, setInvoiceCuit] = useState("");
  const [invoiceBusinessName, setInvoiceBusinessName] = useState("");

  // Pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  useEffect(() => {
  if (shippingMethod !== "PICKUP" && paymentMethod === "CASH") {
    setPaymentMethod("TRANSFER"); // o "MERCADO_PAGO"
  }
}, [shippingMethod, paymentMethod]);
  const [loading, setLoading] = useState(false);

  const vatAmount = useMemo(() => Math.round(subtotalNet * VAT_RATE), [subtotalNet]);

  const shipping = useMemo(() => {
    if (shippingMethod === "PICKUP") return 0;
    if (shippingMethod === "MOTO") return motoLocality ? MOTO_PRICES[motoZone] : 0;
    return 0;
  }, [shippingMethod, motoZone, motoLocality]);

  const baseTotal = subtotalNet + vatAmount + shipping;

  const surcharge = useMemo(() => {
    return paymentMethod === "MERCADO_PAGO" ? Math.round(baseTotal * 0.10) : 0;
  }, [paymentMethod, baseTotal]);

  const total = baseTotal + surcharge;

  const needsAddress = shippingMethod !== "PICKUP";

  const disabledStep1 = useMemo(() => items.length === 0, [items.length]);

  const disabledStep2 = useMemo(() => false, []);

  const disabledStep3 = useMemo(() => {
    if (loading || items.length === 0) return true;
    if (!name.trim() || !email.trim()) return true;

    if (needsAddress) {
      if (!shipStreet.trim() || !shipNumber.trim()) return true;
      if (shippingMethod === "MOTO") {
        const ok = getMotoFromLocality(motoZone, motoLocality);
        if (!motoLocality.trim() || !ok) return true;
      }
    }


    if (invoiceType === "A") {
      if (!invoiceCuit.trim() || !invoiceBusinessName.trim()) return true;
    }
  

    return false;
  }, [
    loading,
    items.length,
    name,
    email,
    needsAddress,
    shippingMethod,
    shipStreet,
    shipNumber,
    invoiceType,
    invoiceCuit,
    invoiceBusinessName,
  ]);

  async function createOrder() {
    // 1) upload opcional
    let uploaded: { url: string; originalName: string; mimeType: string } | null = null;

    if (file) {
      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error("Upload failed");

      const data = (await up.json()) as { url: string; originalName: string; mimeType: string };
      uploaded = data;

      setFileUrl(data.url);
      setFileName(data.originalName);
    }

    // 2) checkout
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || null,
        shipPostalCode: needsAddress ? shipPostalCode.trim() : null,
        shipLocality: shippingMethod === "MOTO" ? motoLocality : null,
        motoZone: shippingMethod === "MOTO" ? motoZone : null,
        customText: customText.trim() || null,
        upload: uploaded
          ? { url: uploaded.url, originalName: uploaded.originalName, mimeType: uploaded.mimeType }
          : null,

        // envío + pago + factura
        shippingMethod,
        motoLocality: shippingMethod === "MOTO" ? motoLocality : null,

        shipStreet: needsAddress ? shipStreet.trim() : null,
        shipNumber: needsAddress ? shipNumber.trim() : null,
        shipApartment: needsAddress ? shipApartment.trim() : null,

        invoiceType,
        invoiceCuit: invoiceType === "A" ? invoiceCuit.trim() : null,
        invoiceBusinessName: invoiceType === "A" ? invoiceBusinessName.trim() : null,

        paymentMethod,

        items: items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice, // neto
          productName: i.name,
          productSlug: i.slug,

          variantId: i.variantId ?? null,
          variantSku: i.variantSku ?? null,
          colorName: (i as any).variantName ?? (i as any).colorName ?? null,
          colorHex: (i as any).colorHex ?? null,

          method: (i as any).method ?? null,
          notes: (i as any).notes ?? null,
        })),
      }),
    });

    if (!res.ok) {
  const err = await res.json().catch(() => null);
  throw new Error(err?.error || "Checkout failed");
}
    return (await res.json()) as { orderId: string; paymentMethod: PaymentMethod; total: number };
  }

  async function onConfirm() {
    setLoading(true);
    try {
      const data = await createOrder();

      clear();

      if (paymentMethod === "COORDINATE") {
        const msg = encodeURIComponent(
          `Hola! Realicé una compra.\nPedido: ${data.orderId}\nNombre: ${name}\nTel: ${phone}\nEmail: ${email}\nEnvío: ${shippingMethod}${shippingMethod === "MOTO" ? " " + motoZone : ""}`
        );
        window.location.href = `https://wa.me/541131002011?text=${msg}`;
        return;
      }

      if (paymentMethod === "TRANSFER") {
        router.push(`/gracias/${data.orderId}?pay=transfer`);
        return;
      }

      // CASH o MERCADO_PAGO (por ahora gracias)
      router.push(`/gracias/${data.orderId}`);
    } catch (e) {
      alert("No se pudo crear el pedido. Revisá consola/servidor.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-conquer-navy">Checkout</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-conquer-pink p-6 text-neutral-600 bg-white">
          Tu carrito está vacío.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* IZQ: wizard */}
          <div className="rounded-3xl border border-conquer-pink bg-white p-5">
            {/* Stepper */}
            <div className="flex items-center gap-2 text-sm">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStep(n as any)}
                  className={`h-9 px-3 rounded-2xl border border-conquer-pink ${step === n ? "bg-conquer-orange text-white border-conquer-orange" : "hover:bg-conquer-pink/10"
                    }`}
                >
                  Paso {n}
                </button>
              ))}
            </div>

            {/* Paso 1 */}
            {step === 1 && (
              <div className="mt-4">
                <div className="font-semibold text-conquer-navy">1) Carrito</div>

                <div className="mt-4 grid gap-3">
                  {items.map((i) => (
                    <div
                      key={(i as any).key ?? `${i.productId}-${(i as any).variantId ?? ""}-${(i as any).method ?? ""}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-conquer-pink p-3"
                    >
                      <div>
                        <div className="font-medium text-conquer-navy">{i.name}</div>
                        {(i as any).variantName && (
                          <div className="mt-1 text-xs text-neutral-600 flex items-center gap-2">
                            <span>Color: <b>{(i as any).variantName}</b></span>
                            {(i as any).colorHex && (
                              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: (i as any).colorHex }} />
                            )}
                          </div>
                        )}
                        {(i as any).method && (
                          <div className="mt-1 text-xs text-neutral-600">
                            Personalización: <b>{(i as any).method}</b>
                          </div>
                        )}
                        <div className="text-sm text-neutral-600">
                          {i.qty} × {formatARS(i.unitPrice)} <span className="text-xs">+ IVA</span>
                        </div>
                      </div>
                      <div className="font-medium text-conquer-navy">{formatARS(i.qty * i.unitPrice)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
                  <div className="flex justify-between text-sm text-neutral-700">
                    <span>Neto</span>
                    <b>{formatARS(subtotalNet)}</b>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-700 mt-2">
                    <span>IVA (21%)</span>
                    <b>{formatARS(vatAmount)}</b>
                  </div>
                  <div className="flex justify-between text-base text-conquer-navy font-semibold mt-3 pt-3 border-t border-conquer-pink/60">
                    <span>Total (sin envío)</span>
                    <span>{formatARS(subtotalNet + vatAmount)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabledStep1}
                  onClick={() => setStep(2)}
                  className="mt-5 h-11 w-full rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            )}

            {/* Paso 2 */}
            {step === 2 && (
              <div className="mt-4">
                <div className="font-semibold text-conquer-navy">2) Personalización</div>

                <div className="mt-4 grid gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      setFileUrl(null);
                      setFileName(null);
                    }}
                    className="rounded-2xl border border-conquer-pink p-2"
                  />

                  {fileName && fileUrl && (
                    <div className="text-xs text-green-700">
                      Archivo listo: <b>{fileName}</b>
                    </div>
                  )}

                  <textarea
                    className="min-h-24 rounded-2xl border border-conquer-pink px-4 py-3"
                    placeholder="Texto a grabar / indicaciones (opcional)"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-11 flex-1 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10"
                  >
                    ← Atrás
                  </button>
                  <button
                    type="button"
                    disabled={disabledStep2}
                    onClick={() => setStep(3)}
                    className="h-11 flex-1 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3 */}
            {step === 3 && (
              <div className="mt-4">
                <div className="font-semibold text-conquer-navy">3) Envío · Datos · Pago</div>

                {/* Envío */}
                <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
                  <div className="text-sm font-semibold text-conquer-navy">Envío</div>

                  <div className="mt-3 grid gap-2">
                    {(["PICKUP", "MOTO", "OCA", "VIACARGO"] as ShippingMethod[]).map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="ship"
                          checked={shippingMethod === m}
                          onChange={() => setShippingMethod(m)}
                        />
                        <span>
                          {m === "PICKUP" ? "Retiro" : m === "MOTO" ? "Moto" : m === "OCA" ? "OCA" : "Vía Cargo"}
                        </span>
                      </label>
                    ))}
                  </div>
                    {shippingMethod === "PICKUP"}
                  {shippingMethod === "MOTO" && (
                    <div className="mt-3 grid gap-3">
                      <div>
                        <div className="text-xs text-neutral-600 mb-1">Localidad (Moto) *</div>

                        <select
                          className="h-11 w-full rounded-2xl border border-conquer-pink px-3"
                          value={`${motoZone}||${motoLocality}`}
                          onChange={(e) => {
                            const [z, loc] = e.target.value.split("||");
                            setMotoZone(z as MotoZone);
                            setMotoLocality(loc);
                          }}
                        >
                          <option value="CABA||">Seleccioná una localidad…</option>

                          {(["CABA", "GBA1", "GBA2"] as MotoZone[]).map((z) => (
                            <optgroup key={z} label={z}>
                              {motoData[z].map((loc) => (
                                <option key={`${z}-${loc}`} value={`${z}||${loc}`}>
                                  {loc}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {motoLocality && (
                          <div className="mt-2 text-xs text-neutral-700">
                            Zona: <b>{motoZone}</b> · Envío: <b>{formatARS(MOTO_PRICES[motoZone])}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  )}



                  {needsAddress && (
                    <div className="mt-4 grid gap-3">
                      <input
                        className="h-11 rounded-2xl border border-conquer-pink px-4"
                        placeholder="Código Postal *"
                        value={shipPostalCode}
                        onChange={(e) => setShipPostalCode(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className="h-11 rounded-2xl border border-conquer-pink px-4"
                          placeholder="Calle *"
                          value={shipStreet}
                          onChange={(e) => setShipStreet(e.target.value)}
                        />
                        <input
                          className="h-11 rounded-2xl border border-conquer-pink px-4"
                          placeholder="Número *"
                          value={shipNumber}
                          onChange={(e) => setShipNumber(e.target.value)}
                        />
                      </div>
                      <input
                        className="h-11 rounded-2xl border border-conquer-pink px-4"
                        placeholder="Depto (opcional)"
                        value={shipApartment}
                        onChange={(e) => setShipApartment(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Datos */}
                <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
                  <div className="text-sm font-semibold text-conquer-navy">Datos</div>

                  <div className="mt-3 grid gap-3">
                    <input
                      className="h-11 rounded-2xl border border-conquer-pink px-4"
                      placeholder="Nombre y apellido *"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <input
                      className="h-11 rounded-2xl border border-conquer-pink px-4"
                      placeholder="Email *"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="h-11 rounded-2xl border border-conquer-pink px-4"
                      placeholder="Teléfono (opcional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Factura */}
                <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
                  <div className="text-sm font-semibold text-conquer-navy">Factura</div>

                  <div className="mt-3 flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={invoiceType === "B"} onChange={() => setInvoiceType("B")} />
                      Factura B
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={invoiceType === "A"} onChange={() => setInvoiceType("A")} />
                      Factura A
                    </label>
                  </div>

                  {invoiceType === "A" && (
                    <div className="mt-3 grid gap-3">
                      <input
                        className="h-11 rounded-2xl border border-conquer-pink px-4"
                        placeholder="CUIT *"
                        value={invoiceCuit}
                        onChange={(e) => setInvoiceCuit(e.target.value)}
                      />
                      <input
                        className="h-11 rounded-2xl border border-conquer-pink px-4"
                        placeholder="Razón social *"
                        value={invoiceBusinessName}
                        onChange={(e) => setInvoiceBusinessName(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Pago */}
                <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
                  <div className="text-sm font-semibold text-conquer-navy">Pago</div>

                  <div className="mt-3 grid gap-2 text-sm">
                    <label className="flex items-center gap-2">
  <input
    type="radio"
    checked={paymentMethod === "CASH"}
    onChange={() => setPaymentMethod("CASH")}
    disabled={shippingMethod !== "PICKUP"}
  />
  <span className={shippingMethod !== "PICKUP" ? "text-neutral-400" : ""}>
    Efectivo (solo retiro)
  </span>
</label>

                    <label className="flex items-center gap-2">
                      <input type="radio" checked={paymentMethod === "TRANSFER"} onChange={() => setPaymentMethod("TRANSFER")} />
                      Transferencia (te mostramos los datos y subís comprobante)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={paymentMethod === "MERCADO_PAGO"} onChange={() => setPaymentMethod("MERCADO_PAGO")} />
                      Mercado Pago (+10% recargo)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={paymentMethod === "COORDINATE"} onChange={() => setPaymentMethod("COORDINATE")} />
                      Coordinar con vendedor (WhatsApp)
                    </label>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  disabled={disabledStep3}
                  onClick={onConfirm}
                  className="mt-5 h-11 w-full rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creando pedido..." : "Confirmar pedido"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="mt-3 h-11 w-full rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10"
                >
                  ← Atrás
                </button>
              </div>
            )}
          </div>

          {/* DER: resumen */}
          <div className="rounded-3xl border border-conquer-pink bg-white p-5">
            <div className="font-semibold text-conquer-navy">Resumen</div>

            <div className="mt-4 rounded-2xl border border-conquer-pink p-4">
              <div className="flex justify-between text-sm text-neutral-700">
                <span>Neto</span>
                <b>{formatARS(subtotalNet)}</b>
              </div>
              <div className="flex justify-between text-sm text-neutral-700 mt-2">
                <span>IVA (21%)</span>
                <b>{formatARS(vatAmount)}</b>
              </div>
              <div className="flex justify-between text-sm text-neutral-700 mt-2">
                <span>Envío</span>
                <b>{formatARS(shipping)}</b>
              </div>
              <div className="flex justify-between text-sm text-neutral-700 mt-2">
                <span>Recargo</span>
                <b>{formatARS(surcharge)}</b>
              </div>

              <div className="flex justify-between text-base text-conquer-navy font-semibold mt-3 pt-3 border-t border-conquer-pink/60">
                <span>Total</span>
                <span>{formatARS(total)}</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-500">
              * Los precios de productos están expresados en neto, se suma IVA en el checkout.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
