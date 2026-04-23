import { prisma } from "@/lib/prisma";
import type { StockSurRow, StockSurVariant } from "@/lib/suppliers/stocksur/client";


function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getUniqueSlug(baseName: string, existingId?: string): Promise<string> {
  let slug = slugify(baseName);

  let exists = await prisma.product.findFirst({
    where: {
      slug,
      NOT: existingId ? { id: existingId } : undefined,
    },
  });

  if (!exists) return slug;

  let counter = 1;
  while (exists) {
    const candidate = `${slug}-${counter}`;
    exists = await prisma.product.findFirst({
      where: {
        slug: candidate,
        NOT: existingId ? { id: existingId } : undefined,
      },
    });

    if (!exists) return candidate;
    counter++;
  }

  return slug;
}

export async function ensureNovedadesCategory() {
  const novedadesSlug = "novedades";

  let category = await prisma.category.findUnique({
    where: { slug: novedadesSlug },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Novedades",
        slug: novedadesSlug,
        active: true,
        order: 0,
      },
    });
  }

  return category;
}

type ImportContext = {
  supplierId: string;
  exchangeRate: number;
  priceRules: { min: number; max: number; multiplier: number }[];
  novedadesCategoryId: string;
};

export async function importNewStockSurRow(row: StockSurRow, ctx: ImportContext) {
  // Buscar o crear producto interno por slug legado o nombre
  let product = await prisma.product.findUnique({
    where: { slug: `sur-${row.externalSku}` },
  });

  if (!product) {
    const friendlySlug = await getUniqueSlug(row.name);

    product = await prisma.product.create({
      data: {
        name: row.name,
        slug: friendlySlug,
        description: row.description || null,
        active: true,
        categories: {
          connect: [{ id: ctx.novedadesCategoryId }],
        },
      },
    });
  }

  let createdVariants = 0;
  let updatedVariants = 0;
  let createdImages = 0;

  for (const varRow of row.variants) {
    const result = await importOrUpdateVariant(product.id, row, varRow, ctx);

    if (result.status === "created") createdVariants++;
    if (result.status === "updated") updatedVariants++;
    if (result.imageCreated) createdImages++;
  }

  return {
    externalSku: row.externalSku,
    productId: product.id,
    status: "linked",
    createdVariants,
    updatedVariants,
    createdImages,
  };
}

async function importOrUpdateVariant(
  productId: string,
  row: StockSurRow,
  varRow: StockSurVariant,
  ctx: ImportContext
) {
  const finalPriceCents = calculateFinalPriceInCents(
    varRow.netPrice,
    ctx.exchangeRate,
    ctx.priceRules
  );

  const colorName = varRow.color?.name || "Sin color";
  const colorHex = varRow.color?.hexCode || null;

  let variant =
    (varRow.externalId
      ? await prisma.productVariant.findFirst({
          where: {
            productId,
            externalVariantId: varRow.externalId,
          },
        })
      : null) ||
    (await prisma.productVariant.findFirst({
      where: {
        productId,
        sku: varRow.sku,
      },
    })) ||
    (await prisma.productVariant.findUnique({
      where: {
        sku: varRow.sku,
      },
    }));

  let imageCreated = false;

  if (!variant) {
    variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: varRow.sku,
        externalVariantId: varRow.externalId,
        colorName,
        colorHex,
        stock: 0, // ✅ stock propio, no proveedor
        priceOverride: finalPriceCents,
      },
    });

    const mainImageUrl = buildMainImageUrl(varRow);
    if (mainImageUrl) {
      const existingImage = await prisma.productImage.findFirst({
        where: {
          productId,
          variantId: variant.id,
          sort: 0,
        },
      });

      if (!existingImage) {
        await prisma.productImage.create({
          data: {
            productId,
            variantId: variant.id,
            url: mainImageUrl,
            alt: row.name,
            sort: 0,
          },
        });

        imageCreated = true;
      }
    }
  } else {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        productId,
        sku: varRow.sku,
        externalVariantId: varRow.externalId,
        priceOverride: finalPriceCents,
        colorName,
        colorHex,
        // ✅ NO tocar stock acá
      },
    });
  }

  // ✅ mapear cada variante externa por SU propio SKU
  await prisma.supplierProduct.upsert({
    where: {
      supplierId_externalSku: {
        supplierId: ctx.supplierId,
        externalSku: varRow.sku,
      },
    },
    update: {
      productId,
      variantId: variant.id,
      externalId: varRow.externalId,
      name: `${row.name} - ${colorName}`,
      supplierStock: varRow.stock,
      supplierPrice: finalPriceCents,
      lastSyncAt: new Date(),
    },
    create: {
      supplierId: ctx.supplierId,
      productId,
      variantId: variant.id,
      externalId: varRow.externalId,
      externalSku: varRow.sku,
      name: `${row.name} - ${colorName}`,
      supplierStock: varRow.stock,
      supplierPrice: finalPriceCents,
      lastSyncAt: new Date(),
    },
  });

  return {
    status: variant ? "updated" as const : "created" as const,
    variantId: variant.id,
    imageCreated,
  };
}

function buildMainImageUrl(varRow: StockSurVariant) {
  const imageUrl =
    varRow.images?.original ||
    varRow.images?.medium ||
    varRow.images?.small ||
    varRow.images?.detail?.original ||
    varRow.images?.detail?.medium ||
    varRow.images?.detail?.small ||
    varRow.images?.other?.[0]?.original ||
    varRow.images?.other?.[0]?.medium ||
    varRow.images?.other?.[0]?.small;

  if (!imageUrl) return null;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return imageUrl;

  const encodedUrl = encodeURIComponent(imageUrl);
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${encodedUrl}`;
}
type PriceRule = {
  min: number;
  max: number;
  multiplier: number;
};

export async function ensureSupplier() {
  return prisma.supplier.upsert({
    where: { code: "SUR" },
    update: {},
    create: { name: "Stock Sur (CDO)", code: "SUR", active: true },
  });
}

export async function getPriceRules(): Promise<PriceRule[]> {
  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });

  return rules.map((r) => ({
    min: r.minUsd,
    max: r.maxUsd,
    multiplier: r.multiplier,
  }));
}

export async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });

  return setting ? parseFloat(setting.value) : 1200;
}

export function calculateFinalPriceInCents(
  supplierPriceInUSD: number,
  exchangeRate: number,
  rules: PriceRule[]
): number {
  const rule = rules.find(
    (r) => supplierPriceInUSD >= r.min && supplierPriceInUSD <= r.max
  );

  const multiplier = rule ? rule.multiplier : 1.5;
  const priceInARS = supplierPriceInUSD * exchangeRate;
  const finalPrice = priceInARS * multiplier;

  return Math.round(finalPrice * 100);
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][];
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) throw new Error("chunkSize debe ser mayor a 0");

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

type SyncContext = {
  supplierId: string;
  exchangeRate: number;
  priceRules: PriceRule[];
};

export async function syncStockAndPriceRow(row: StockSurRow, ctx: SyncContext) {
  let updated = 0;
  let skipped = 0;

  for (const varRow of row.variants) {
    const result = await syncVariantStockAndPriceOnly(row, varRow, ctx);

    if (result.status === "updated") updated++;
    if (result.status === "skipped_not_linked") skipped++;
  }

  return {
    externalSku: row.externalSku,
    status: updated > 0 ? "updated" : "skipped_not_linked",
    updatedVariants: updated,
    skippedVariants: skipped,
  };
}
async function syncVariantStockAndPriceOnly(
  row: StockSurRow,
  varRow: StockSurVariant,
  ctx: SyncContext
) {
  const supplierProduct = await prisma.supplierProduct.findUnique({
    where: {
      supplierId_externalSku: {
        supplierId: ctx.supplierId,
        externalSku: varRow.sku,
      },
    },
    include: {
      product: true,
      variant: true,
    },
  });

  // Si no está mapeada esa variante externa, no tocar nada
  if (!supplierProduct || !supplierProduct.productId || !supplierProduct.variantId) {
    return {
      externalSku: varRow.sku,
      status: "skipped_not_linked" as const,
    };
  }

  const finalPriceCents = calculateFinalPriceInCents(
    varRow.netPrice,
    ctx.exchangeRate,
    ctx.priceRules
  );

  const colorName = varRow.color?.name || "Sin color";
  const colorHex = varRow.color?.hexCode || null;

  // ✅ actualizar variante interna SIN tocar stock propio
  await prisma.productVariant.update({
    where: { id: supplierProduct.variantId },
    data: {
      priceOverride: finalPriceCents,
      colorName,
      colorHex,
      externalVariantId: varRow.externalId,
      // NO stock
    },
  });

  // ✅ actualizar stock del proveedor
  await prisma.supplierProduct.update({
    where: { id: supplierProduct.id },
    data: {
      externalId: varRow.externalId,
      name: `${row.name} - ${colorName}`,
      supplierStock: varRow.stock,
      supplierPrice: finalPriceCents,
      lastSyncAt: new Date(),
    },
  });

  return {
    externalSku: varRow.sku,
    status: "updated" as const,
  };
}