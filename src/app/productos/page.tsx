import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PAGE_SIZE = 24;

function buildQueryString(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    sp.set(k, s);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function clampPage(n: number, totalPages: number) {
  if (!Number.isFinite(n) || n < 1) return 1;
  if (totalPages > 0 && n > totalPages) return totalPages;
  return n;
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.cat === "string" ? sp.cat.trim() : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;

  const where = {
    active: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(cat ? { categories: { some: { slug: cat } } } : {}),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = clampPage(pageRaw, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  const prevHref = `/productos${buildQueryString({
    q,
    cat,
    page: page > 1 ? page - 1 : undefined,
  })}`;

  const nextHref = `/productos${buildQueryString({
    q,
    cat,
    page: page < totalPages ? page + 1 : undefined,
  })}`;

  // paginación compacta (1 ... cerca de actual ... última)
  const pageLinks = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (p === 1 || p === totalPages) return true;
    if (Math.abs(p - page) <= 2) return true;
    return false;
  });

  return (
    <main className="p-6">
      <h1 className="text-2xl text-center font-semibold">Productos</h1>

      {(q || cat) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <span>Filtros:</span>

          {q && (
            <span className="rounded-full border px-3 py-1">
              Buscar: <b>{q}</b>
            </span>
          )}
          {cat && (
            <span className="rounded-full border px-3 py-1">
              Categoría: <b>{cat}</b>
            </span>
          )}

          <Link href="/productos" className="ml-auto underline">
            Limpiar
          </Link>
        </div>
      )}

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
          No se encontraron productos.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => {
              const img = p.images[0]?.url;
              const firstPrice = p.priceTiers[0]?.price ?? p.basePrice ?? 0;

              return (
                <div key={p.id} className="rounded-2xl border p-4 hover:shadow-sm transition">
                  <Link href={`/productos/${p.slug}`} className="block">
                    <div className="aspect-square w-full rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img ? (
                        <img src={img} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-neutral-500 text-sm">Sin imagen</span>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="font-medium text-center">{p.name}</div>
                      <div className="text-sm text-neutral-600 mt-1">
                        Desde <span className="font-semibold">${firstPrice}</span>
                        <span className="text-xs"> + IVA</span>
                      </div>
                    </div>
                  </Link>

                  {p.categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.categories.map((c) => (
                        <Link
                          key={c.id}
                          href={`/productos${buildQueryString({ q, cat: c.slug })}`}
                          className="rounded-full border px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginación abajo centrada */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="text-sm text-neutral-600">
                Página <b>{page}</b> de <b>{totalPages}</b> · Total <b>{total}</b>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={prevHref}
                  aria-disabled={page <= 1}
                  className={`h-10 px-4 rounded-2xl border flex items-center justify-center ${
                    page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-neutral-50"
                  }`}
                >
                  ← Anterior
                </Link>

                {pageLinks.map((p, idx) => {
                  const prev = pageLinks[idx - 1];
                  const showDots = prev != null && p - prev > 1;
                  return (
                    <span key={p} className="flex items-center gap-2">
                      {showDots && <span className="px-1 text-neutral-400">…</span>}
                      <Link
                        href={`/productos${buildQueryString({ q, cat, page: p === 1 ? undefined : p })}`}
                        className={`h-10 w-10 rounded-2xl border flex items-center justify-center ${
                          p === page ? "bg-black text-white border-black" : "hover:bg-neutral-50"
                        }`}
                      >
                        {p}
                      </Link>
                    </span>
                  );
                })}

                <Link
                  href={nextHref}
                  aria-disabled={page >= totalPages}
                  className={`h-10 px-4 rounded-2xl border flex items-center justify-center ${
                    page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-neutral-50"
                  }`}
                >
                  Siguiente →
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
