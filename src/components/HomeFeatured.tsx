import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "./FeaturedCarousel"; // ajustá la ruta según tu estructura

export const runtime = "nodejs";

export default async function HomeFeatured() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      images: { orderBy: { sort: "asc" }, take: 1 },
      priceTiers: { orderBy: { minQty: "asc" } },
      variants: true
    },
  });

  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
        <h2 className="text-2xl font-bold text-conquer-navy">✨ Destacados</h2>
        <Link
          href="/productos"
          className="flex items-center gap-1 text-sm font-medium text-conquer-navy hover:text-conquer-orange transition-colors"
        >
          Ver todos
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6">
        <FeaturedCarousel products={products} />
      </div>
    </section>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";