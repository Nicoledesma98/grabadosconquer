import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PAGE_SIZE = 24;

type SortKey = "new" | "old" | "name_asc" | "name_desc";
type StatusKey = "all" | "active" | "inactive";

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

function parseStatus(raw: unknown): StatusKey {
  const s = typeof raw === "string" ? raw : "";
  if (s === "active" || s === "inactive" || s === "all") return s;
  return "all";
}

function parseSort(raw: unknown): SortKey {
  const s = typeof raw === "string" ? raw : "";
  if (s === "new" || s === "old" || s === "name_asc" || s === "name_desc") return s;
  return "new";
}

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;

  const status = parseStatus(sp.status);
  const sort = parseSort(sp.sort);

  const where: any = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status === "active" ? { active: true } : {}),
    ...(status === "inactive" ? { active: false } : {}),
  };

  const orderBy =
    sort === "new"
      ? ({ createdAt: "desc" } as const)
      : sort === "old"
      ? ({ createdAt: "asc" } as const)
      : sort === "name_asc"
      ? ({ name: "asc" } as const)
      : ({ name: "desc" } as const);

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = clampPage(pageRaw, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      images: { take: 1, orderBy: { sort: "asc" } },
      variants: { select: { id: true } },
      categories: { select: { id: true } },
      priceTiers: { select: { id: true } },
    },
  });

  const prevHref = `/admin/productos${buildQueryString({
    q,
    status,
    sort,
    page: page > 1 ? page - 1 : undefined,
  })}`;

  const nextHref = `/admin/productos${buildQueryString({
    q,
    status,
    sort,
    page: page < totalPages ? page + 1 : undefined,
  })}`;

  const pageLinks = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (p === 1 || p === totalPages) return true;
    if (Math.abs(p - page) <= 2) return true;
    return false;
  });

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin · Productos</h1>

        <Link
          href="/admin/productos/nuevo"
          className="h-10 px-4 rounded-2xl bg-black text-white flex items-center justify-center"
        >
          Nuevo producto
        </Link>
      </div>

      {/* Buscador + filtros */}
      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
        action="/admin/productos"
        method="GET"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, slug o descripción..."
          className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white"
        />

        <select
          name="status"
          defaultValue={status}
          className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white text-conquer-navy"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <select
          name="sort"
          defaultValue={sort}
          className="h-11 rounded-2xl border border-conquer-pink px-4 bg-white text-conquer-navy"
        >
          <option value="new">Más nuevos</option>
          <option value="old">Más viejos</option>
          <option value="name_asc">Nombre A→Z</option>
          <option value="name_desc">Nombre Z→A</option>
        </select>

        <div className="flex gap-2">
          <button className="h-11 px-5 rounded-2xl bg-conquer-orange text-white font-semibold hover:opacity-90">
            Aplicar
          </button>

          {(q || status !== "all" || sort !== "new") && (
            <Link
              href="/admin/productos"
              className="h-11 px-5 rounded-2xl border border-conquer-pink text-conquer-navy flex items-center justify-center hover:bg-conquer-pink/10"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <div className="mt-3 text-sm text-neutral-600">
        Total: <b>{total}</b> · Página <b>{page}</b>/<b>{totalPages}</b>
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-conquer-pink p-6 text-neutral-600 bg-white">
          No hay productos {q ? "para esa búsqueda" : "con esos filtros"}.
        </div>
      ) : (
        <>
          {/* Lista collapse */}
          <div className="mt-6 grid gap-3">
            {products.map((p) => {
              const img = p.images[0]?.url ?? null;

              return (
                <details
                  key={p.id}
                  className="rounded-3xl border border-conquer-pink bg-white overflow-hidden"
                >
                  <summary className="cursor-pointer list-none p-4 hover:bg-conquer-pink/10">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl border border-conquer-pink bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img ? (
                          <img src={img} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-neutral-500">Sin img</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-conquer-navy truncate">{p.name}</div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              p.active
                                ? "border-green-200 text-green-700"
                                : "border-red-200 text-red-700"
                            }`}
                          >
                            {p.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-neutral-600 truncate">
                          slug: <b>{p.slug}</b>
                          {p.basePrice != null ? (
                            <>
                              {" "}— base: <b>${p.basePrice}</b>
                            </>
                          ) : null}
                        </div>

                        <div className="mt-1 text-xs text-neutral-500">
                          Variantes: <b>{p.variants.length}</b> · Tiers: <b>{p.priceTiers.length}</b> · Categorías:{" "}
                          <b>{p.categories.length}</b>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500">(click para abrir)</div>
                    </div>
                  </summary>

                  <div className="p-4 border-t border-conquer-pink/60">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-conquer-pink p-3">
                        <div className="text-xs text-neutral-500">ID</div>
                        <div className="text-sm font-mono break-all">{p.id}</div>
                      </div>

                      <div className="rounded-2xl border border-conquer-pink p-3">
                        <div className="text-xs text-neutral-500">Acciones</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={`/admin/productos/${p.id}/editar`}
                            className="h-10 px-4 rounded-2xl bg-conquer-orange text-white font-semibold flex items-center justify-center hover:opacity-90"
                          >
                            Editar
                          </Link>

                          <Link
                            href={`/productos/${p.slug}`}
                            className="h-10 px-4 rounded-2xl border border-conquer-pink text-conquer-navy flex items-center justify-center hover:bg-conquer-pink/10"
                            target="_blank"
                          >
                            Ver en tienda
                          </Link>
                        </div>
                      </div>
                    </div>

                    {p.description ? (
                      <div className="mt-3 rounded-2xl border border-conquer-pink p-3 text-sm text-neutral-700">
                        <div className="text-xs text-neutral-500 mb-1">Descripción</div>
                        {p.description}
                      </div>
                    ) : null}
                  </div>
                </details>
              );
            })}
          </div>

          {/* Paginación abajo centrada */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={prevHref}
                  aria-disabled={page <= 1}
                  className={`h-10 px-4 rounded-2xl border border-conquer-pink flex items-center justify-center ${
                    page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-conquer-pink/10"
                  }`}
                >
                  ← Anterior
                </Link>

                {pageLinks.map((pNum, idx) => {
                  const prev = pageLinks[idx - 1];
                  const showDots = prev != null && pNum - prev > 1;

                  return (
                    <span key={pNum} className="flex items-center gap-2">
                      {showDots && <span className="px-1 text-neutral-400">…</span>}
                      <Link
                        href={`/admin/productos${buildQueryString({
                          q,
                          status,
                          sort,
                          page: pNum === 1 ? undefined : pNum,
                        })}`}
                        className={`h-10 w-10 rounded-2xl border border-conquer-pink flex items-center justify-center ${
                          pNum === page
                            ? "bg-conquer-orange text-white border-conquer-orange"
                            : "hover:bg-conquer-pink/10"
                        }`}
                      >
                        {pNum}
                      </Link>
                    </span>
                  );
                })}

                <Link
                  href={nextHref}
                  aria-disabled={page >= totalPages}
                  className={`h-10 px-4 rounded-2xl border border-conquer-pink flex items-center justify-center ${
                    page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-conquer-pink/10"
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
