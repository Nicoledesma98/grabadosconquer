import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function AdminProductosPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { images: { take: 1, orderBy: { sort: "asc" } } },
  });

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin · Productos</h1>

        <Link
          href="/admin/productos/nuevo"
          className="h-10 px-4 rounded-2xl bg-black text-white flex items-center justify-center"
        >
          Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
          No hay productos todavía.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = p.images[0]?.url;

            return (
              <Link
                key={p.id}
                href={`/admin/productos/${p.id}/editar`}
                className="rounded-2xl border p-4 hover:shadow-sm transition"
              >
                <div className="aspect-square w-full rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-neutral-500 text-sm">Sin imagen</span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{p.name}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        p.active ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {p.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-neutral-600">
                    <div>slug: <b>{p.slug}</b></div>
                    {p.basePrice != null && (
                      <div>base: <b>${p.basePrice}</b></div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
