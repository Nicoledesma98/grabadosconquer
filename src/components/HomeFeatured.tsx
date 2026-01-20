import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function HomeFeatured() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" } },
    },
  });

  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-conquer-navy">Destacados</h2>
        <Link
          href="/productos"
          className="text-sm text-conquer-navy hover:text-conquer-orange"
        >
          Ver todos →
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => {
          const img = p.images[0]?.url;
          const price = p.priceTiers[0]?.price ?? p.basePrice ?? 0;

          return (
            <Link
              key={p.id}
              href={`/productos/${p.slug}`}
              className="group overflow-hidden rounded-3xl border border-conquer-pink bg-white hover:shadow-sm transition"
            >
              <div className="relative h-44 w-full bg-conquer-pink/10">
                {img ? (
                  <Image
                    src={img}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="font-medium text-conquer-navy line-clamp-2">
                  {p.name}
                </div>
                <div className="mt-2 text-sm text-neutral-600">
                  Desde <span className="font-semibold">{formatARS(price)}</span>
                </div>

                <div className="mt-3 inline-flex rounded-full bg-conquer-orange px-3 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition">
                  Ver detalle
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
