import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import FeaturedCarousel from "./FeaturedCarousel";
import { unstable_cache } from "next/cache";

// ✅ Cache de 5 minutos — los destacados no cambian en cada request
const getCachedFeatured = unstable_cache(
  async () => {
    const productsRaw = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
        basePrice: true,
        baseUsdPrice: true,
        stock: true,
        discountActive: true,
        discountPercent: true,
        images: {
          orderBy: { sort: "asc" },
          take: 1,
          select: { url: true, alt: true },
        },
        priceTiers: {
          orderBy: { minQty: "asc" },
          take: 1,
          select: { 
            price: true,
          minQty: true,
         },
        },
        // ✅ Solo lo que usa FeaturedCarousel para calcular precio
        variants: {
          select: {
            stock: true,
            priceOverride: true,
          },
        },
      },
    });

    return productsRaw.map((p) => ({
      ...p,
      baseUsdPrice: p.baseUsdPrice ? Number(p.baseUsdPrice) : null,
    }));
  },
  ["home-featured"],
  { revalidate: 300 }
);

export default async function HomeFeatured() {
  const t0 = Date.now();
  const products = await getCachedFeatured();
console.log("⏱ featured ms:", Date.now() - t0);
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