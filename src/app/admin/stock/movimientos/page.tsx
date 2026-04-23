import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickFirst(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
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

export default async function AdminStockMovimientosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};

  const q = String(pickFirst(sp.q)).trim();
  const source = String(pickFirst(sp.source)).trim() || "all";
  const movementType = String(pickFirst(sp.movementType)).trim() || "all";
  const orderId = String(pickFirst(sp.orderId)).trim();
  const pageRaw = Number(pickFirst(sp.page) || "1");
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;

  const where: any = {
    ...(source !== "all" ? { source } : {}),
    ...(movementType !== "all" ? { movementType } : {}),
    ...(orderId ? { orderId: { contains: orderId, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { notes: { contains: q, mode: "insensitive" as const } },
            { product: { name: { contains: q, mode: "insensitive" as const } } },
            { product: { slug: { contains: q, mode: "insensitive" as const } } },
            { variant: { sku: { contains: q, mode: "insensitive" as const } } },
            { variant: { colorName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const totalCount = await prisma.stockMovement.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = clamp(page, 1, totalPages);

  const movements = await prisma.stockMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      variant: {
        select: {
          id: true,
          sku: true,
          colorName: true,
          productId: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-conquer-navy">
            Movimientos de stock
          </h1>
          <p className="text-sm text-neutral-600">
            Historial de ingresos y egresos
          </p>
        </div>

        <Link
          href="/admin/stock"
          className="h-10 px-4 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
        >
          ← Volver a stock
        </Link>
      </div>

      <div className="rounded-3xl border border-conquer-pink bg-white p-4">
        <form
          method="GET"
          action="/admin/stock/movimientos"
          className="flex flex-wrap gap-3"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por producto, slug, SKU, color o nota..."
            className="h-11 flex-1 min-w-[240px] rounded-2xl border border-conquer-pink px-4"
          />

          <input
            name="orderId"
            defaultValue={orderId}
            placeholder="Filtrar por orderId..."
            className="h-11 min-w-[220px] rounded-2xl border border-conquer-pink px-4"
          />

          <select
            name="source"
            defaultValue={source}
            className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white"
          >
            <option value="all">Todas las fuentes</option>
            <option value="OWN">Propio</option>
            <option value="SUPPLIER">Proveedor</option>
          </select>

          <select
            name="movementType"
            defaultValue={movementType}
            className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white"
          >
            <option value="all">Todos los tipos</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>

          <button
            type="submit"
            className="h-11 px-5 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90"
          >
            Buscar
          </button>

          <Link
            href="/admin/stock/movimientos"
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
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, totalCount)}
              </b>{" "}
              de <b>{totalCount}</b>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-conquer-pink bg-white mt-6">
        <table className="min-w-full text-sm">
          <thead className="bg-conquer-pink/10 text-conquer-navy">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Fuente</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Variante / SKU</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Stock anterior</th>
              <th className="px-4 py-3 text-right">Stock nuevo</th>
              <th className="px-4 py-3 text-left">Pedido</th>
              <th className="px-4 py-3 text-left">Nota</th>
            </tr>
          </thead>

          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-conquer-pink/30">
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatDate(m.createdAt)}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      m.source === "OWN"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.source === "OWN" ? "Propio" : "Proveedor"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      m.movementType === "OUT"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {m.movementType}
                  </span>
                </td>

                <td className="px-4 py-3">
                  {m.product ? (
                    <div>
                      <div className="font-medium text-conquer-navy">
                        {m.product.name}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {m.product.slug}
                      </div>
                    </div>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {m.variant ? (
                    <div>
                      <div className="font-mono text-conquer-navy">
                        {m.variant.sku}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {m.variant.colorName || "Sin color"}
                      </div>
                    </div>
                  ) : (
                    <span className="text-neutral-400">Producto simple</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right font-semibold">
                  {m.quantity}
                </td>

                <td className="px-4 py-3 text-right">
                  {m.previousStock ?? "-"}
                </td>

                <td className="px-4 py-3 text-right">
                  {m.newStock ?? "-"}
                </td>

                <td className="px-4 py-3">
                  {m.orderId ? (
                    <span className="font-mono text-xs">{m.orderId}</span>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>

                <td className="px-4 py-3 text-xs text-neutral-600">
                  {m.notes || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {currentPage > 1 ? (
            <Link
              href={`/admin/stock/movimientos${buildUrl({
                q,
                source,
                movementType,
                orderId,
                page: currentPage - 1,
              })}`}
              className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="h-9 px-3 rounded-2xl border border-conquer-pink text-neutral-400 flex items-center">
              ← Anterior
            </span>
          )}

          <span className="text-sm text-neutral-600">
            Página <b>{currentPage}</b> de <b>{totalPages}</b>
          </span>

          {currentPage < totalPages ? (
            <Link
              href={`/admin/stock/movimientos${buildUrl({
                q,
                source,
                movementType,
                orderId,
                page: currentPage + 1,
              })}`}
              className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
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
    </main>
  );
}