import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStockSurPage } from "@/lib/suppliers/stocksur/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function getUniqueSlug(baseName: string, existingId?: string): Promise<string> {
  let slug = slugify(baseName);

  let exists = await prisma.product.findFirst({
    where: { slug, NOT: existingId ? { id: existingId } : undefined },
  });
  if (!exists) return slug;

  let counter = 1;
  while (exists) {
    const candidate = `${slug}-${counter}`;
    exists = await prisma.product.findFirst({
      where: { slug: candidate, NOT: existingId ? { id: existingId } : undefined },
    });
    if (!exists) return candidate;
    counter++;
  }

  return slug;
}

async function ensureSupplier() {
  return await prisma.supplier.upsert({
    where: { code: "SUR" },
    update: {},
    create: { name: "Stock Sur (CDO)", code: "SUR", active: true },
  });
}

async function getPriceRules() {
  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });

  return rules.map((r) => ({
    min: r.minUsd,
    max: r.maxUsd,
    multiplier: r.multiplier,
  }));
}

async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });
  return setting ? parseFloat(setting.value) : 1200;
}

async function ensureNovedadesCategory() {
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
    console.log("✅ Categoría 'Novedades' creada automáticamente");
  }

  return category;
}

function calculateFinalPriceInCents(
  supplierPriceInUSD: number,
  exchangeRate: number,
  rules: { min: number; max: number; multiplier: number }[]
): number {
  const rule = rules.find(
    (r) => supplierPriceInUSD >= r.min && supplierPriceInUSD <= r.max
  );

  const multiplier = rule ? rule.multiplier : 1.5;
  const priceInARS = supplierPriceInUSD * exchangeRate;
  const finalPrice = priceInARS * multiplier;

  return Math.round(finalPrice * 100);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let exchangeRate = body.exchangeRate;

    if (!exchangeRate) {
      exchangeRate = await getExchangeRate();
    }

    const token = process.env.SS_AUTH_TOKEN;
    if (!token) throw new Error("Falta STOCKSUR_AUTH_TOKEN en .env");

    const priceRules = await getPriceRules();
    const supplier = await ensureSupplier();
    const novedadesCategory = await ensureNovedadesCategory();
    const data = await fetchStockSurPage(token, 100, 1);
    const rows = data.products;

    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        done: true,
        count: 0,
        results: [],
      });
    }

    const results = [];

    for (const row of rows) {
      // --- Producto interno ---
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
              connect: [{ id: novedadesCategory.id }],
            },
          },
        });
      }

      // --- Variantes ---
      for (const varRow of row.variants) {
        let variant = await prisma.productVariant.findFirst({
          where: {
            sku: varRow.sku,
            productId: product.id,
          },
        });

        const finalPriceCents = calculateFinalPriceInCents(
          varRow.netPrice,
          exchangeRate,
          priceRules
        );

        const colorName = varRow.color?.name || "Sin color";
        const colorHex = varRow.color?.hexCode || null;

        if (!variant) {
          let mainImageUrl: string | null = null;

          if (varRow.images.original) {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            if (cloudName) {
              const encodedUrl = encodeURIComponent(varRow.images.original);
              mainImageUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/${encodedUrl}`;
            } else {
              mainImageUrl = varRow.images.original;
            }
          }

          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: varRow.sku,
              colorName,
              colorHex,
              stock: 0, // ✅ stock propio
              priceOverride: finalPriceCents,
              externalVariantId: varRow.sku, // ✅ usamos SKU externo de la variante
            },
          });

          if (mainImageUrl) {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                variantId: variant.id,
                url: mainImageUrl,
                alt: `${row.name} - ${colorName}`,
                sort: 0,
              },
            });
          }
        } else {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              colorName,
              colorHex,
              priceOverride: finalPriceCents,
              externalVariantId: varRow.sku, // ✅ usamos SKU externo
            },
          });
        }

        // ✅ cada variante externa se mapea por su propio SKU
        await prisma.supplierProduct.upsert({
          where: {
            supplierId_externalSku: {
              supplierId: supplier.id,
              externalSku: varRow.sku,
            },
          },
          update: {
            productId: product.id,
            variantId: variant.id,
            externalId: row.externalId,
            name: `${row.name} - ${colorName}`,
            supplierStock: varRow.stock,
            supplierPrice: finalPriceCents,
            lastSyncAt: new Date(),
          },
          create: {
            supplierId: supplier.id,
            productId: product.id,
            variantId: variant.id,
            externalId: row.externalId,
            externalSku: varRow.sku,
            name: `${row.name} - ${colorName}`,
            supplierStock: varRow.stock,
            supplierPrice: finalPriceCents,
            lastSyncAt: new Date(),
          },
        });
      }

      results.push({
        externalId: row.externalId,
        externalSku: row.externalSku,
        productId: product.id,
        status: "ok",
      });
    }

    return NextResponse.json({
      ok: true,
      total: rows.length,
      results,
    });
  } catch (error: any) {
    console.error("Error en sync StockSur:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Error interno",
        results: [],
      },
      { status: 500 }
    );
  }
}