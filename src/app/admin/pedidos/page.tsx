import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";


export const runtime = "nodejs";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}
function prettyPayment(m: string) {
  const x = String(m || "").toUpperCase();
  if (x === "CASH") return "Efectivo";
  if (x === "TRANSFER") return "Transferencia";
  if (x === "MERCADO_PAGO") return "Mercado Pago";
  if (x === "COORDINATE") return "Coordinar con vendedor";
  return m || "-";
}
function prettyShipping(m: string) {
  const x = String(m || "").toUpperCase();
  if (x === "PICKUP") return "Retiro";
  if (x === "MOTO") return "Moto";
  if (x === "OCA") return "OCA";
  if (x === "VIACARGO") return "Via Cargo";
  return m || "-";
}

function prettyInvoice(t: string) {
  const x = String(t || "").toUpperCase();
  if (x === "A") return "Factura A";
  if (x === "B") return "Factura B";
  return t || "-";
}

export default async function AdminPedidosPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { orderBy: { id: "asc" } },
      uploads: { orderBy: { createdAt: "asc" } }, // ✅ agregado
    },
  });


  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Link href="/productos" className="text-sm underline">
          Ir a productos
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
          No hay pedidos todavía.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {orders.map((o) => (
            <details
              key={o.id}
              className="rounded-3xl border border-conquer-pink bg-white overflow-hidden"
            >
              <summary className="cursor-pointer list-none p-4 hover:bg-conquer-pink/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-conquer-navy">Pedido: {o.id}</div>
                    <div className="text-sm text-neutral-600">{o.createdAt.toLocaleString("es-AR")}</div>
                    <div className="text-sm text-neutral-600">{o.customerEmail}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <OrderStatusSelect orderId={o.id} initialStatus={o.status} />
                    <div className="text-right">
                      <div className="text-sm text-neutral-600">Total</div>
                      <div className="text-xl font-semibold text-conquer-navy">{formatARS(o.total)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  (Click para ver detalle)
                </div>
              </summary>

              <div className="p-4 border-t border-conquer-pink/60">
                <div className="text-sm text-neutral-700">
                  <b>Cliente:</b> {o.customerName || "-"} — {o.customerEmail || "-"}{" "}
                  {o.customerPhone ? `— ${o.customerPhone}` : ""}
                </div>
                {/* Pago / Envío / Factura + Totales */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-conquer-pink bg-white p-4">
                    <div className="text-sm font-semibold text-conquer-navy mb-2">Datos del pedido</div>

                    <div className="grid gap-2 text-sm text-neutral-700">
                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Pago</span>
                        <b className="text-conquer-navy">{prettyPayment(String(o.paymentMethod))}</b>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Envío</span>
                        <b className="text-conquer-navy">
                          {prettyShipping(String(o.shippingMethod))}
                          {String(o.shippingMethod).toUpperCase() === "MOTO" && o.motoZone ? ` (${o.motoZone})` : ""}
                        </b>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Factura</span>
                        <b className="text-conquer-navy">{prettyInvoice(String(o.invoiceType))}</b>
                      </div>

                      {String(o.invoiceType).toUpperCase() === "A" && (
                        <div className="mt-2 rounded-2xl border border-conquer-pink/70 p-3 text-sm">
                          <div className="text-xs text-neutral-500">Datos Factura A</div>
                          <div className="mt-1 text-neutral-700">
                            <b>CUIT:</b> {o.invoiceCuit || "-"}
                          </div>
                          <div className="text-neutral-700">
                            <b>Razón social:</b> {o.invoiceBusinessName || "-"}
                          </div>
                        </div>
                      )}

                      {/* Dirección si no es retiro */}
                      {String(o.shippingMethod).toUpperCase() !== "PICKUP" && (
                        <div className="mt-2 rounded-2xl border border-conquer-pink/70 p-3 text-sm">
                          <div className="text-xs text-neutral-500">Dirección</div>
                          <div className="mt-1 text-neutral-700">
                            {o.shipStreet || "-"} {o.shipNumber || ""} {o.shipApartment ? `, ${o.shipApartment}` : ""}
                          </div>
                          <div className="text-neutral-700">
                            <b>CP:</b> {o.shipPostalCode || "-"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-conquer-pink bg-white p-4">
                    <div className="text-sm font-semibold text-conquer-navy mb-2">Totales</div>

                    <div className="grid gap-2 text-sm text-neutral-700">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Neto</span>
                        <b>{formatARS(o.subtotalNet)}</b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-neutral-500">IVA ({o.vatRate}%)</span>
                        <b>{formatARS(o.vatAmount)}</b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-neutral-500">Envío</span>
                        <b>{formatARS(o.shipping)}</b>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-neutral-500">Recargo</span>
                        <b>{formatARS(o.paymentSurcharge)}</b>
                      </div>

                      <div className="pt-3 mt-2 border-t border-conquer-pink/60 flex justify-between text-base font-semibold text-conquer-navy">
                        <span>Total</span>
                        <span>{formatARS(o.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold text-conquer-navy mb-2">Items</div>

                  <div className="grid gap-2">
                    {o.items.map((it) => (
                      <div key={it.id} className="rounded-2xl border border-conquer-pink/70 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium">
                              {it.qty}× {it.productName}{" "}
                              <span className="text-neutral-500 text-xs">({it.productSlug})</span>
                            </div>

                            {(it.colorName || it.variantSku) && (
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                                {it.colorName && (
                                  <>
                                    <span>Color: <b>{it.colorName}</b></span>
                                    {it.colorHex && (
                                      <span
                                        className="h-3 w-3 rounded-full border"
                                        style={{ backgroundColor: it.colorHex }}
                                      />
                                    )}
                                  </>
                                )}
                                {it.variantSku && <span className="text-neutral-400">SKU: {it.variantSku}</span>}
                              </div>
                            )}

                            {it.method && (
                              <div className="mt-1 text-xs text-neutral-600">
                                Personalización: <b>{it.method}</b>
                                {it.notes ? <span className="text-neutral-500"> — {it.notes}</span> : null}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 font-semibold text-conquer-navy">
                            {formatARS(it.lineTotal)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const personalizationUploads = o.uploads.filter((u) =>
                      ["TEXT", "IMAGE", "PDF", "DOC"].includes(u.type)
                    );

                    const paymentProofUploads = o.uploads.filter((u) =>
                      u.type === "PAYMENT_PROOF"
                      // Si todavía NO agregaste PAYMENT_PROOF al enum, usá esto:
                      // u.type === "OTHER" && (u.originalName || "").toLowerCase().includes("comprobante")
                    );

                    return (
                      <>
                        {/* PERSONALIZACIÓN */}
                        {personalizationUploads.length > 0 && (
                          <div className="mt-4 rounded-3xl border border-conquer-pink bg-conquer-pink/10 p-4 text-sm">
                            <div className="font-semibold text-conquer-navy mb-2">Personalización</div>

                            <div className="grid gap-2">
                              {personalizationUploads.map((u) => (
                                <div key={u.id} className="text-neutral-800">
                                  <b>{u.type}</b>:{" "}
                                  {u.text ? (
                                    <span>{u.text}</span>
                                  ) : u.url ? (
                                    <a
                                      href={u.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline"
                                    >
                                      {u.originalName || "Abrir archivo"}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* COMPROBANTE */}
                        {paymentProofUploads.length > 0 && (
                          <div className="mt-3 rounded-3xl border border-conquer-pink bg-white p-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-full bg-conquer-orange text-white text-xs font-semibold px-3 py-1">
                                Comprobante de pago
                              </span>
                            </div>

                            <div className="mt-2 grid gap-2">
                              {paymentProofUploads.map((u) => (
                                <div key={u.id} className="text-neutral-800">
                                  {u.url ? (
                                    <a
                                      href={u.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline"
                                    >
                                      {u.originalName || "Abrir comprobante"}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                </div>
              </div>
            </details>
          ))}

        </div>
      )}
    </main>
  );
}
