import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.cat === "string" ? sp.cat.trim() : "";

  // Por ahora: como todavía NO modelamos categorías en la DB,
  // el filtro cat lo dejamos "visual" (mostramos el filtro activo),
  // y el buscador sí filtra por name/description/slug.
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(q
        ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
        : {}),
      ...(cat ? { categories: { some: { slug: cat } } } : {}), // ✅ ESTA ES LA LINEA
    },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" } },
      categories: { orderBy: { name: "asc" } }, // ✅
    },
  });


  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Productos</h1>

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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.images[0]?.url;
            const firstPrice = p.priceTiers[0]?.price ?? p.basePrice ?? 0;

            return (
              <div
                key={p.id}
                className="rounded-2xl border p-4 hover:shadow-sm transition"
              >
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
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-neutral-600 mt-1">
                      Desde <span className="font-semibold">${firstPrice}</span>
                    </div>
                  </div>
                </Link>

                {p.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/productos?cat=${encodeURIComponent(c.slug)}`}
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
      )}
    </main>
  );
}
