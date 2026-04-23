import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ToggleProductActiveButton from "@/components/admin/ToggleProductActiveButton";

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

type Row = {
  id: string;
  rowType: "variant" | "simple";
  productId: string;
  variantId: string | null;
  sku: string;
  productName: string;
  productSlug: string;
  productActive: boolean;
  colorName: string | null;
  ownStock: number;
  supplierStock: number;
  webVisibleStock: number;
  supplierMaps: {
    id: string;
    externalSku: string | null;
    name: string | null;
    supplierStock: number | null;
    supplier: {
      id: string;
      name: string;
      code: string;
    };
  }[];
  lastMovement: {
    id: string;
    source: string;
    movementType: string;
    quantity: number;
    createdAt: Date;
    notes: string | null;
  } | null;
};

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};

  const q = String(pickFirst(sp.q)).trim();
  const filter = String(pickFirst(sp.filter)).trim() || "all";
  const pageRaw = Number(pickFirst(sp.page) || "1");
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;

  const variantWhere: any = q
    ? {
        OR: [
          { sku: { contains: q, mode: "insensitive" as const } },
          { colorName: { contains: q, mode: "insensitive" as const } },
          { product: { name: { contains: q, mode: "insensitive" as const } } },
          { product: { slug: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const simpleWhere: any = {
    variants: { none: {} },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [variants, simpleProducts] = await Promise.all([
    prisma.productVariant.findMany({
      where: variantWhere,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
          },
        },
        supplierMaps: {
          select: {
            id: true,
            externalSku: true,
            name: true,
            supplierStock: true,
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            source: true,
            movementType: true,
            quantity: true,
            createdAt: true,
            notes: true,
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { colorName: "asc" }],
    }),
    prisma.product.findMany({
      where: simpleWhere,
      include: {
        supplierMap: {
          select: {
            id: true,
            externalSku: true,
            name: true,
            supplierStock: true,
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            source: true,
            movementType: true,
            quantity: true,
            createdAt: true,
            notes: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const variantRows: Row[] = variants.map((v) => {
    const supplierStock = v.supplierMaps.reduce(
      (acc, s) => acc + (s.supplierStock ?? 0),
      0,
    );

    return {
      id: v.id,
      rowType: "variant",
      productId: v.product.id,
      variantId: v.id,
      sku: v.sku,
      productName: v.product.name,
      productSlug: v.product.slug,
      productActive: v.product.active,
      colorName: v.colorName,
      ownStock: v.stock,
      supplierStock,
      webVisibleStock: v.stock + supplierStock,
      supplierMaps: v.supplierMaps,
      lastMovement: v.stockMovements[0] ?? null,
    };
  });

  const simpleRows: Row[] = simpleProducts.map((p) => {
    const supplierStock = p.supplierMap.reduce(
      (acc, s) => acc + (s.supplierStock ?? 0),
      0,
    );

    return {
      id: p.id,
      rowType: "simple",
      productId: p.id,
      variantId: null,
      sku: "SIN-VARIANTE",
      productName: p.name,
      productSlug: p.slug,
      productActive: p.active,
      colorName: null,
      ownStock: p.stock ?? 0,
      supplierStock,
      webVisibleStock: (p.stock ?? 0) + supplierStock,
      supplierMaps: p.supplierMap,
      lastMovement: p.stockMovements[0] ?? null,
    };
  });

  let rows = [...variantRows, ...simpleRows];

  if (filter === "own") {
    rows = rows.filter((r) => r.ownStock > 0);
  } else if (filter === "supplier") {
    rows = rows.filter((r) => r.supplierStock > 0);
  } else if (filter === "mixed") {
    rows = rows.filter((r) => r.ownStock > 0 && r.supplierStock > 0);
  } else if (filter === "unmapped") {
    rows = rows.filter((r) => r.supplierMaps.length === 0);
  } else if (filter === "movements") {
    rows = rows.filter((r) => !!r.lastMovement);
  }

  rows.sort((a, b) => a.productName.localeCompare(b.productName));

  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = clamp(page, 1, totalPages);

  const pagedRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <main className="max-w-7xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-conquer-navy">Stock</h1>
          <p className="text-sm text-neutral-600">
            Vista unificada de productos simples y variantes
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/stock/ingresar"
            className="h-10 px-4 rounded-2xl bg-conquer-orange text-white hover:opacity-90 flex items-center"
          >
            Ingresar mercadería
          </Link>

          <Link
            href="/admin/stock/sacar"
            className="h-10 px-4 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
          >
            Sacar mercadería
          </Link>

          <Link
            href="/admin/stock/movimientos"
            className="h-10 px-4 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center"
          >
            Ver movimientos
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-conquer-pink bg-white p-4">
        <form
          method="GET"
          action="/admin/stock"
          className="flex flex-wrap gap-3"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por producto, slug, SKU o color..."
            className="h-11 flex-1 min-w-[240px] rounded-2xl border border-conquer-pink px-4"
          />

          <select
            name="filter"
            defaultValue={filter}
            className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white"
          >
            <option value="all">Todos</option>
            <option value="own">Con stock propio</option>
            <option value="supplier">Con stock proveedor</option>
            <option value="mixed">Mixtos</option>
            <option value="unmapped">Sin mapear</option>
            <option value="movements">Con movimientos</option>
          </select>

          <button
            type="submit"
            className="h-11 px-5 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90"
          >
            Buscar
          </button>

          <Link
            href="/admin/stock"
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
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Variante</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-right">Stock propio</th>
              <th className="px-4 py-3 text-right">Stock proveedor</th>
              <th className="px-4 py-3 text-right">Stock web</th>
              <th className="px-4 py-3 text-left">Proveedor vinculado</th>
              <th className="px-4 py-3 text-left">Último movimiento</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pagedRows.map((item) => (
              <tr
                key={`${item.rowType}-${item.id}`}
                className="border-t border-conquer-pink/30"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-conquer-navy">
                    {item.productName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {item.productSlug}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    {item.rowType === "variant"
                      ? "VARIANTE"
                      : "PRODUCTO SIMPLE"}
                  </div>
                </td>

                <td className="px-4 py-3">{item.colorName || "-"}</td>

                <td className="px-4 py-3 font-mono">{item.sku}</td>

                <td className="px-4 py-3 text-right font-semibold">
                  {item.ownStock}
                </td>

                <td className="px-4 py-3 text-right font-semibold">
                  {item.supplierStock}
                </td>

                <td className="px-4 py-3 text-right font-bold text-conquer-orange">
                  {item.webVisibleStock}
                </td>

                <td className="px-4 py-3">
                  {item.supplierMaps.length > 0 ? (
                    <div className="space-y-1">
                      {item.supplierMaps.map((s) => (
                        <div key={s.id} className="text-xs">
                          <div className="font-medium text-conquer-navy">
                            {s.supplier.name}
                          </div>
                          <div className="text-neutral-500">
                            SKU ext: {s.externalSku || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-red-500">Sin mapear</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  {item.lastMovement ? (
                    <div className="text-xs">
                      <div className="font-medium text-conquer-navy">
                        {item.lastMovement.movementType} ·{" "}
                        {item.lastMovement.source}
                      </div>
                      <div className="text-neutral-500">
                        Cantidad: {item.lastMovement.quantity}
                      </div>
                      <div className="text-neutral-500">
                        {formatDate(item.lastMovement.createdAt)}
                      </div>
                      {item.lastMovement.notes && (
                        <div className="text-neutral-500">
                          {item.lastMovement.notes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">
                      Sin movimientos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={
                        item.variantId
                          ? `/admin/stock/vincular?productId=${item.productId}&variantId=${item.variantId}`
                          : `/admin/stock/vincular?productId=${item.productId}`
                      }
                      className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center text-xs"
                    >
                      Vincular proveedor
                    </Link>

                    <Link
                      href={`/admin/stock/movimientos?q=${encodeURIComponent(
                        item.variantId ? item.sku : item.productSlug,
                      )}`}
                      className="h-9 px-3 rounded-2xl border border-conquer-pink hover:bg-conquer-pink/10 flex items-center text-xs"
                    >
                      Ver movimientos
                    </Link>
                    <ToggleProductActiveButton
                      productId={item.productId}
                      active={item.productActive}
                    />
                  </div>
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
              href={`/admin/stock${buildUrl({ q, filter, page: currentPage - 1 })}`}
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
              href={`/admin/stock${buildUrl({ q, filter, page: currentPage + 1 })}`}
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
