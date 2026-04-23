export const runtime = "nodejs";

import Link from "next/link";
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
      categories: {
        orderBy: { name: "asc" },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      supplierMap: {
        select: {
          supplierStock: true,
        },
      },
      variants: {
        orderBy: { createdAt: "asc" },
        include: {
          supplierMaps: {
            select: {
              supplierStock: true,
            },
          },
        },
      },
    },
  });

  if (!product || !product.active) return notFound();

  const productWebStock =
    product.variants.length > 0
      ? product.variants.reduce((acc, v) => {
          const supplierStock = v.supplierMaps.reduce(
            (sum, s) => sum + (s.supplierStock ?? 0),
            0
          );
          return acc + v.stock + supplierStock;
        }, 0)
      : (product.stock ?? 0) +
        product.supplierMap.reduce(
          (sum, s) => sum + (s.supplierStock ?? 0),
          0
        );

  const primaryCategory = product.categories[0] ?? null;
  const parentCategory = primaryCategory?.parent ?? null;

  return (
<main className="p-6">
  <div className="mx-auto max-w-6xl">
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
      <Link
        href="/"
        className="transition-colors hover:text-conquer-orange"
      >
        Inicio
      </Link>

      <span className="text-conquer-pink/60">/</span>

      <Link
        href="/productos"
        className="transition-colors hover:text-conquer-orange"
      >
        Productos
      </Link>

      {parentCategory && (
        <>
          <span className="text-conquer-pink/60">/</span>
          <Link
            href={`/productos?cat=${encodeURIComponent(parentCategory.slug)}`}
            className="transition-colors hover:text-conquer-orange"
          >
            {parentCategory.name}
          </Link>
        </>
      )}

      {primaryCategory && (
        <>
          <span className="text-conquer-pink/60">/</span>
          <Link
            href={`/productos?cat=${encodeURIComponent(primaryCategory.slug)}`}
            className="transition-colors hover:text-conquer-orange"
          >
            {primaryCategory.name}
          </Link>
        </>
      )}

      <span className="text-conquer-pink/60">/</span>
      <span className="font-semibold text-conquer-navy">
        {product.name}
      </span>
    </nav>
  </div>

  <ProductDetailClient
    product={{
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      stock: productWebStock,
      minQtyStep: product.minQtyStep ?? 1,
      minPurchaseQty: product.minPurchaseQty ?? 1,
      discountActive: product.discountActive,
      discountPercent: product.discountPercent,
      images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
      priceTiers: product.priceTiers.map((t) => ({
        minQty: t.minQty,
        price: t.price,
      })),
      variants: product.variants.map((v) => {
        const supplierStock = v.supplierMaps.reduce(
          (sum, s) => sum + (s.supplierStock ?? 0),
          0
        );

        return {
          id: v.id,
          sku: v.sku,
          colorName: v.colorName,
          colorHex: v.colorHex,
          stock: v.stock + supplierStock,
          priceOverride: v.priceOverride ?? null,
        };
      }),
      allowedMethods: product.allowedMethods,
    }}
  />
</main>
  );
}