import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchNFPage } from "@/lib/suppliers/nuevasformas/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSupplier() {
  return await prisma.supplier.upsert({
    where: { code: "NF" },
    update: {},
    create: { name: "Nuevas Formas", code: "NF", active: true },
  });
}

function extractColorFromAttributes(attributes: any[] | undefined): string | null {
  if (!attributes || !Array.isArray(attributes)) return null;
  const colorAttr = attributes.find(
    (a) => a.name?.toLowerCase().includes("color") || a.option
  );
  return colorAttr?.option || colorAttr?.name || null;
}

export async function POST(req: Request) {
  try {
    const { page = 1, perPage = 20 } = await req.json();
    const rows = await fetchNFPage(page, perPage);
    const supplier = await ensureSupplier();
    const results = [];

    // ✅ Siempre devolvemos results (aunque sea vacío)
    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        done: true,
        page,
        perPage,
        count: 0,
        results: [], // 👈 IMPORTANTE
      });
    }

    for (const row of rows) {
      // --- SupplierProduct ---
      const supplierProduct = await prisma.supplierProduct.upsert({
        where: {
          supplierId_externalSku: {
            supplierId: supplier.id,
            externalSku: row.externalSku,
          },
        },
        update: {
          name: row.name,
          supplierStock: row.supplierStock,
          supplierPrice: row.supplierPrice,
          lastSyncAt: new Date(),
        },
        create: {
          supplierId: supplier.id,
          externalId: row.externalId,
          externalSku: row.externalSku,
          name: row.name,
          supplierStock: row.supplierStock,
          supplierPrice: row.supplierPrice,
          lastSyncAt: new Date(),
        },
      });

      // --- Producto interno ---
      let product = await prisma.product.findUnique({
        where: { slug: `nf-${row.externalSku}` },
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
            slug: `nf-${row.externalSku}`,
            description: `Producto sincronizado de Nuevas Formas (SKU: ${row.externalSku})`,
            basePrice: row.supplierPrice,
            active: true,
          },
        });
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: { basePrice: row.supplierPrice, name: row.name },
        });
      }

      await prisma.supplierProduct.update({
        where: { id: supplierProduct.id },
        data: { productId: product.id },
      });

      // --- Variaciones ---
      if (row.variations && row.variations.length > 0) {
        for (const varRow of row.variations) {
          let variant = await prisma.productVariant.findFirst({
            where: { sku: varRow.externalSku, productId: product.id },
          });

          const colorName = extractColorFromAttributes(varRow.attributes) || varRow.name;
          const colorHex = null;

          if (!variant) {
            variant = await prisma.productVariant.create({
              data: {
                productId: product.id,
                sku: varRow.externalSku,
                colorName,
                colorHex,
                stock: varRow.supplierStock,
                priceOverride:
                  varRow.supplierPrice !== row.supplierPrice ? varRow.supplierPrice : null,
              },
            });
          } else if (!variant.priceLocked) {
            await prisma.productVariant.update({
              where: { id: variant.id },
              data: {
                stock: varRow.supplierStock,
                priceOverride:
                  varRow.supplierPrice !== row.supplierPrice ? varRow.supplierPrice : null,
              },
            });
          } else {
            await prisma.productVariant.update({
              where: { id: variant.id },
              data: { stock: varRow.supplierStock },
            });
          }

          await prisma.supplierProduct.update({
            where: { id: supplierProduct.id },
            data: { variantId: variant.id },
          });
        }
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
      page,
      perPage,
      count: rows.length,
      results, // 👈 siempre array
    });
  } catch (error: any) {
    console.error("Error en sync NF:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error interno", results: [] },
      { status: 500 }
    );
  }
}