export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import ProductDetailClient from "./product-detail-client";
import { notFound } from "next/navigation";

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sort: "asc" } },
      priceTiers: { orderBy: { minQty: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!product || !product.active) return notFound();
  console.log("ALLOWED_METHODS:", product.allowedMethods);


  return (
    <main className="p-6">
      <ProductDetailClient
  product={{
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    basePrice: product.basePrice,
    stock: product.stock, // <- agregar esto
    minQtyStep: product.minQtyStep ?? 1,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    priceTiers: product.priceTiers.map((t) => ({
      minQty: t.minQty,
      price: t.price,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      colorName: v.colorName,
      colorHex: v.colorHex,
      stock: v.stock,
      priceOverride: v.priceOverride ?? null,
    })),
    allowedMethods: product.allowedMethods,
  }}
/>
    </main>
  );
}
