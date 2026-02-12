import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatARS } from "@/lib/utils"; // creá esta función o mové la que ya tenés
import { ChevronLeft, ChevronRight, Sparkles, Package, Search, Tag } from "lucide-react";
import ProductFilters from "./components/ProductFilters";

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
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const minPrice = typeof sp.minPrice === "string" ? parseInt(sp.minPrice, 10) : undefined;
  const maxPrice = typeof sp.maxPrice === "string" ? parseInt(sp.maxPrice, 10) : undefined;
  const inStock = sp.inStock === "true";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;

  // Construir filtro WHERE
  const where: any = {
    active: true,
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(cat && { categories: { some: { slug: cat } } }),
  };

  // Filtro por precio
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.AND = [];
    if (minPrice !== undefined) {
      where.AND.push({
        OR: [
          { basePrice: { gte: minPrice } },
          { priceTiers: { some: { price: { gte: minPrice } } } },
        ],
      });
    }
    if (maxPrice !== undefined) {
      where.AND.push({
        OR: [
          { basePrice: { lte: maxPrice } },
          { priceTiers: { some: { price: { lte: maxPrice } } } },
        ],
      });
    }
  }

  // Filtro por stock
  if (inStock) {
    where.OR = where.OR || [];
    where.OR.push(
      { variants: { some: { stock: { gt: 0 } } } },
      { variants: { none: {} } } // productos sin variantes se consideran con stock
    );
  }

  // Ordenamiento
  let orderBy: any = {};
  switch (sort) {
    case "price_asc":
      orderBy = { basePrice: "asc" };
      break;
    case "price_desc":
      orderBy = { basePrice: "desc" };
      break;
    case "name_asc":
      orderBy = { name: "asc" };
      break;
    case "name_desc":
      orderBy = { name: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = clampPage(pageRaw, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  // Obtener nombre de categoría para el título (si está filtrado)
  let categoryName = cat;
  if (cat) {
    const category = await prisma.category.findUnique({
      where: { slug: cat },
      select: { name: true },
    });
    categoryName = category?.name || cat;
  }

  // Links de paginación
  const prevHref = `/productos${buildQueryString({
    q,
    cat,
    sort,
    minPrice,
    maxPrice,
    inStock: inStock ? "true" : undefined,
    page: page > 1 ? page - 1 : undefined,
  })}`;

  const nextHref = `/productos${buildQueryString({
    q,
    cat,
    sort,
    minPrice,
    maxPrice,
    inStock: inStock ? "true" : undefined,
    page: page < totalPages ? page + 1 : undefined,
  })}`;

  // Generar números de página para paginación
  const pageLinks = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (p === 1 || p === totalPages) return true;
    if (Math.abs(p - page) <= 2) return true;
    return false;
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-conquer-pink/5 py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* Cabecera */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-conquer-navy sm:text-3xl">
              {cat ? categoryName : "Todos los productos"}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {total} {total === 1 ? "producto encontrado" : "productos encontrados"}
            </p>
          </div>
        </div>

        {/* Componente de filtros */}
        <ProductFilters />

        {/* Filtros activos (búsqueda, categoría) */}
        {(q || cat) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">Filtros activos:</span>
            {q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-conquer-pink/20 px-3 py-1.5 text-xs text-conquer-navy">
                <Search className="h-3 w-3" />
                {q}
              </span>
            )}
            {cat && (
              <span className="inline-flex items-center gap-1 rounded-full bg-conquer-pink/20 px-3 py-1.5 text-xs text-conquer-navy">
                <Tag className="h-3 w-3" />
                {categoryName}
              </span>
            )}
            <Link
              href="/productos"
              className="ml-auto text-xs text-conquer-orange hover:underline"
            >
              Limpiar todos
            </Link>
          </div>
        )}

        {/* Grid de productos */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-conquer-pink/30 bg-white p-12 text-center">
            <Package className="h-16 w-16 text-conquer-pink/40" />
            <h3 className="mt-4 text-lg font-semibold text-conquer-navy">
              No hay productos
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              No encontramos productos con los filtros seleccionados.
            </p>
            <Link
              href="/productos"
              className="mt-6 rounded-full bg-conquer-orange px-6 py-3 text-sm font-medium text-white shadow-md transition-all hover:scale-105 hover:shadow-xl"
            >
              Ver todos los productos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
                const img = product.images[0]?.url;
                const price = product.priceTiers[0]?.price ?? product.basePrice ?? 0;
                const isNew =
                  new Date(product.createdAt).getTime() >
                  Date.now() - 7 * 24 * 60 * 60 * 1000;

                // Verificar stock disponible
                const hasStock =
                  product.variants.length === 0 ||
                  product.variants.some((v) => v.stock > 0);

                return (
                  <Link
                    key={product.id}
                    href={`/productos/${product.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-conquer-pink/30 bg-white p-4 transition-all duration-300 hover:scale-[1.02] hover:border-conquer-orange hover:shadow-xl"
                  >
                    {/* Badge Nuevo */}
                    {isNew && (
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-conquer-orange px-3 py-1 text-xs font-bold text-white shadow-md">
                        <Sparkles className="h-3 w-3" />
                        NUEVO
                      </span>
                    )}

                    {/* Imagen */}
                    <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-conquer-pink/10 to-conquer-turq/10">
                      {img ? (
                        <Image
                          src={img}
                          alt={product.name}
                          fill
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-400">
                          <Package className="h-10 w-10" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-conquer-navy">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xs text-neutral-500">Desde</span>
                        <span className="text-lg font-bold text-conquer-orange">
                          {formatARS(price)}
                        </span>
                      </div>

                      {/* Stock */}
                      <div className="mt-2 flex items-center gap-1">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            hasStock ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="text-xs text-neutral-600">
                          {hasStock ? "En stock" : "Sin stock"}
                        </span>
                      </div>

                      {/* Categorías (máx 2) */}
                      {product.categories.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {product.categories.slice(0, 2).map((c) => (
                            <span
                              key={c.id}
                              className="rounded-full bg-conquer-pink/10 px-2 py-0.5 text-[10px] text-conquer-navy"
                            >
                              {c.name}
                            </span>
                          ))}
                          {product.categories.length > 2 && (
                            <span className="text-[10px] text-neutral-500">
                              +{product.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hover reveal */}
                    <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-gradient-to-t from-white to-transparent p-4 transition-transform duration-300 group-hover:translate-y-0">
                      <span className="flex items-center gap-1 text-sm font-medium text-conquer-orange">
                        Ver detalle
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-12 flex flex-col items-center gap-4">
                <div className="text-sm text-neutral-600">
                  Mostrando <span className="font-semibold">{(page - 1) * PAGE_SIZE + 1}</span> -{" "}
                  <span className="font-semibold">
                    {Math.min(page * PAGE_SIZE, total)}
                  </span>{" "}
                  de <span className="font-semibold">{total}</span> productos
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href={prevHref}
                    aria-disabled={page <= 1}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                      page <= 1
                        ? "pointer-events-none border-neutral-200 bg-neutral-100 text-neutral-400"
                        : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-orange/10"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Link>

                  {pageLinks.map((p, idx) => {
                    const prev = pageLinks[idx - 1];
                    const showDots = prev != null && p - prev > 1;
                    return (
                      <span key={p} className="flex items-center gap-1">
                        {showDots && (
                          <span className="px-2 text-neutral-400">…</span>
                        )}
                        <Link
                          href={`/productos${buildQueryString({
                            q,
                            cat,
                            sort,
                            minPrice,
                            maxPrice,
                            inStock: inStock ? "true" : undefined,
                            page: p === 1 ? undefined : p,
                          })}`}
                          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-all ${
                            p === page
                              ? "border-conquer-orange bg-conquer-orange text-white shadow-md"
                              : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-orange/10"
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
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                      page >= totalPages
                        ? "pointer-events-none border-neutral-200 bg-neutral-100 text-neutral-400"
                        : "border-conquer-pink/30 bg-white text-conquer-navy hover:border-conquer-orange hover:bg-conquer-orange/10"
                    }`}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}