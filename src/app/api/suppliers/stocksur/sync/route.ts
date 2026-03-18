import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStockSurPage } from "@/lib/suppliers/stocksur/client";
import { uploadImageFromUrl } from "@/lib/cloudinary/uploadFromUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSupplier() {
  return await prisma.supplier.upsert({
    where: { code: "SUR" },
    update: {},
    create: { name: "Stock Sur (CDO)", code: "SUR", active: true },
  });
}

// Función para obtener las reglas desde la BD
async function getPriceRules() {
  const rules = await prisma.priceRule.findMany({
    orderBy: { minUsd: "asc" },
  });
  return rules.map(r => ({
    min: r.minUsd,
    max: r.maxUsd,
    multiplier: r.multiplier,
  }));
}

// Función para obtener el tipo de cambio guardado
async function getExchangeRate() {
  const setting = await prisma.setting.findUnique({
    where: { key: "exchange_rate" },
  });
  return setting ? parseFloat(setting.value) : 1200; // valor por defecto
}

function calculateFinalPriceInCents(
  supplierPriceInUSD: number,
  exchangeRate: number,
  rules: { min: number; max: number; multiplier: number }[]
): number {
  // Buscar la regla que aplica según el precio en USD
  const rule = rules.find(r => supplierPriceInUSD >= r.min && supplierPriceInUSD <= r.max);
  const multiplier = rule ? rule.multiplier : 1.5; // fallback

  const priceInARS = supplierPriceInUSD * exchangeRate;
  const finalPrice = priceInARS * multiplier;
  return Math.round(finalPrice * 100);
}

export async function POST(req: Request) {
  try {
    // 1. Obtener el exchangeRate del body (opcional, si no viene usamos el de BD)
    const body = await req.json().catch(() => ({}));
    let exchangeRate = body.exchangeRate;

    // 2. Si no vino, lo obtenemos de la BD
    if (!exchangeRate) {
      exchangeRate = await getExchangeRate();
    }

    const token = process.env.SS_AUTH_TOKEN;
    if (!token) throw new Error("Falta STOCKSUR_AUTH_TOKEN en .env");

    // 3. Obtener las reglas de precio desde la BD
    const priceRules = await getPriceRules();

    const supplier = await ensureSupplier();

    // Obtener productos de la API
    const data = await fetchStockSurPage(token, 100, 1);
    const rows = data.products;

    if (!rows.length) {
      return NextResponse.json({ ok: true, done: true, count: 0, results: [] });
    }

    const results = [];

    for (const row of rows) {
      // --- SupplierProduct ---
      const supplierProduct = await prisma.supplierProduct.upsert({
        where: {
          supplierId_externalSku: {
            supplierId: supplier.id,
            externalSku: row.externalSku,
          },
        },
        update: { name: row.name, lastSyncAt: new Date() },
        create: {
          supplierId: supplier.id,
          externalId: row.externalId,
          externalSku: row.externalSku,
          name: row.name,
          lastSyncAt: new Date(),
        },
      });

      // --- Producto interno ---
      let product = await prisma.product.findUnique({
        where: { slug: `sur-${row.externalSku}` },
      });

      if (!product && supplierProduct.productId) {
        product = await prisma.product.findUnique({
          where: { id: supplierProduct.productId },
        });
      }

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: row.name,
            slug: `sur-${row.externalSku}`,
            description: row.description || null,
            active: true,
          },
        });
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: { name: row.name, description: row.description },
        });
      }

      await prisma.supplierProduct.update({
        where: { id: supplierProduct.id },
        data: { productId: product.id },
      });

      // --- Variantes ---
      for (const varRow of row.variants) {
        let variant = await prisma.productVariant.findFirst({
          where: { sku: varRow.sku, productId: product.id },
        });

        // Calcular precio final usando reglas de BD
        const finalPriceCents = calculateFinalPriceInCents(
          varRow.netPrice,
          exchangeRate,
          priceRules
        );

        // Subir imagen
        let mainImageUrl = null;
        if (varRow.images.original) {
          mainImageUrl = await uploadImageFromUrl(
            varRow.images.original,
            `products/${product.id}`
          );
        }

        const colorName = varRow.color?.name || "Sin color";
        const colorHex = varRow.color?.hexCode || null;

        if (!variant) {
          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku: varRow.sku,
              colorName,
              colorHex,
              stock: varRow.stock,
              priceOverride: finalPriceCents,
            },
          });
        } else {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              stock: varRow.stock,
              colorName,
              colorHex,
              priceOverride: finalPriceCents,
            },
          });
        }

        await prisma.supplierProduct.update({
          where: { id: supplierProduct.id },
          data: { variantId: variant.id },
        });

        // Imagen principal
        if (mainImageUrl) {
          const existingImage = await prisma.productImage.findFirst({
            where: { productId: product.id, variantId: variant.id, sort: 0 },
          });

          if (existingImage) {
            await prisma.productImage.update({
              where: { id: existingImage.id },
              data: { url: mainImageUrl, alt: row.name },
            });
          } else {
            await prisma.productImage.create({
              data: {
                productId: product.id,
                variantId: variant.id,
                url: mainImageUrl,
                alt: row.name,
                sort: 0,
              },
            });
          }
        }
      }

      results.push({
        externalId: row.externalId,
        externalSku: row.externalSku,
        productId: product.id,
        status: "ok",
      });
    }

    return NextResponse.json({ ok: true, total: rows.length, results });
  } catch (error: any) {
    console.error("Error en sync StockSur:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error interno", results: [] },
      { status: 500 }
    );
  }
}