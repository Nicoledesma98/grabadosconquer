import Link from "next/link";
import { prisma } from "@/lib/prisma";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";
import StopPropagation from "@/components/StopPropagation";

export const runtime = "nodejs";

const PAGE_SIZE = 10;

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

function buildUrl(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickFirst(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function AdminPedidosPage({
  searchParams,
}: {
  // 👇 En Next 16: searchParams puede venir como Promise
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ✅ IMPORTANTÍSIMO: unwrap
  const sp = searchParams ? await searchParams : {};

  const q = String(pickFirst(sp.q)).trim();
  const pageRaw = Number(pickFirst(sp.page) || "1");
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;

  const where =
    q.length > 0
      ? {
        OR: [
          { id: { contains: q, mode: "insensitive" as const } },
          { customerEmail: { contains: q, mode: "insensitive" as const } },
          { customerPhone: { contains: q } },
        ],
      }
      : {};

  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = clamp(page, 1, totalPages);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      items: { orderBy: { id: "asc" } },
      uploads: { orderBy: { createdAt: "asc" } },
    },
  });

  const pagesToShow: (number | "...")[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const s = new Set<number>();
    s.add(1);
    s.add(totalPages);
    s.add(currentPage);
    s.add(currentPage - 1);
    s.add(currentPage + 1);
    s.add(currentPage - 2);
    s.add(currentPage + 2);

    const nums = Array.from(s).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

    const out: (number | "...")[] = [];
    for (let i = 0; i < nums.length; i++) {
      out.push(nums[i]);
      if (i < nums.length - 1 && nums[i + 1] - nums[i] > 1) out.push("...");
    }
    return out;
  })();

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Link href="/productos" className="text-sm underline">
          Ir a productos
        </Link>
      </div>

      {/* 🔎 BUSCADOR */}
      <div className="mt-4 rounded-3xl border border-conquer-pink bg-white p-4">
        <form method="GET" action="/admin/pedidos" className="flex flex-wrap gap-3 items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por N° pedido / email / teléfono…"
            className="h-11 flex-1 min-w-[240px] rounded-2xl border border-conquer-pink px-4"
          />

          <button
            type="submit"
            className="h-11 px-5 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90"
          >
            Buscar
          </button>

          <Link
            href="/admin/pedidos"
            className="h-11 px-5 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
          >
            Limpiar
          </Link>
        </form>

        <div className="mt-3 text-xs text-neutral-600">
          {totalCount === 0 ? (
            <>Sin resultados.</>
          ) : (
            <>
              Mostrando{" "}
              <b>
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)}
              </b>{" "}
              de <b>{totalCount}</b>
            </>
          )}
        </div>

        {/* 📄 PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {currentPage > 1 ? (
              <Link
                className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
                href={`/admin/pedidos${buildUrl({ q, page: currentPage - 1 })}`}
              >
                ← Anterior
              </Link>
            ) : (
              <span className="h-9 px-3 rounded-2xl border border-conquer-pink text-neutral-400 flex items-center">
                ← Anterior
              </span>
            )}

            {pagesToShow.map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-2 text-neutral-500">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={`/admin/pedidos${buildUrl({ q, page: p })}`}
                  className={`h-9 px-3 rounded-2xl border border-conquer-pink flex items-center ${p === currentPage
                      ? "bg-conquer-orange text-white border-conquer-orange"
                      : "hover:bg-conquer-pink/10"
                    }`}
                >
                  {p}
                </Link>
              )
            )}

            {currentPage < totalPages ? (
              <Link
                className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
                href={`/admin/pedidos${buildUrl({ q, page: currentPage + 1 })}`}
              >
                Siguiente →
              </Link>
            ) : (
              <span className="h-9 px-3 rounded-2xl border border-conquer-pink text-neutral-400 flex items-center">
                Siguiente →
              </span>
            )}
          </div>
        )}
      </div>

      {/* LISTA */}
      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600 bg-white">
          No hay pedidos para mostrar.
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
                    <StopPropagation>
                      <OrderStatusSelect orderId={o.id} initialStatus={o.status} />
                    </StopPropagation>

                    <div className="text-right">
                      <div className="text-sm text-neutral-600">Total</div>
                      <div className="text-xl font-semibold text-conquer-navy">{formatARS(o.total)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-neutral-500">(Click para ver detalle)</div>
              </summary>

              <div className="p-4 border-t border-conquer-pink/60">
                <div className="text-sm text-neutral-700">
                  <b>Cliente:</b> {o.customerName || "-"} — {o.customerEmail || "-"}{" "}
                  {o.customerPhone ? `— ${o.customerPhone}` : ""}
                </div>

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
                          {String(o.shippingMethod).toUpperCase() === "MOTO"
                            ? ` (${o.motoZone ?? "-"})${o.shipLocality ? ` - ${o.shipLocality}` : ""}`
                            : ""}
                        </b>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-neutral-500">Factura</span>
                        <b className="text-conquer-navy">{prettyInvoice(String(o.invoiceType))}</b>
                      </div>

                      {String(o.shippingMethod).toUpperCase() !== "PICKUP" && (
                        <div className="mt-2 rounded-2xl border border-conquer-pink/70 p-3 text-sm">
                          <div className="text-xs text-neutral-500">Dirección</div>
                          <div className="mt-1 text-neutral-700">
                            {o.shipStreet || "-"} {o.shipNumber || ""}{" "}
                            {o.shipApartment ? `, ${o.shipApartment}` : ""}
                          </div>
                          <div className="text-neutral-700">
                            <b>CP:</b> {o.shipPostalCode || "-"}
                          </div>
                          <div className="text-neutral-700">
                            <b>Localidad:</b> {o.shipLocality || "-"}
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
                                    <span>
                                      Color: <b>{it.colorName}</b>
                                    </span>
                                    {it.colorHex && (
                                      <span
                                        className="h-3 w-3 rounded-full border"
                                        style={{ backgroundColor: it.colorHex }}
                                        title={it.colorHex}
                                      />
                                    )}
                                  </>
                                )}
                                {it.variantSku && (
                                  <span className="text-neutral-400">SKU: {it.variantSku}</span>
                                )}
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

                  {/* uploads lo dejaste bien, si querés lo volvemos a pegar completo */}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
