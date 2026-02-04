import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fetchNFPageMock, normalizeNF } from "@/lib/suppliers/nuevasformas/client";

export const runtime = "nodejs";

function isAdmin(session: any) {
  return session?.user && (session.user as any).role === "ADMIN";
}

function pickFirst(v: string | string[] | null) {
  if (!v) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(pickFirst(url.searchParams.get("page")) || "1"));

    // 1) asegurar supplier
    const supplier = await prisma.supplier.upsert({
      where: { code: "NUEVASFORMAS" },
      update: {},
      create: { code: "NUEVASFORMAS", name: "NuevasFormas", active: true },
      select: { id: true },
    });

    // 2) fetch (MOCK por ahora)
    const useMock =
      String(process.env.USE_MOCK_SUPPLIER ?? "true").toLowerCase() === "true";

    const rawItems = useMock
      ? await fetchNFPageMock(page)
      : (() => {
          // después de las 18: acá va el fetch real a WooCommerce
          throw new Error("Fetch real no implementado todavía (USE_MOCK_SUPPLIER=false).");
        })();

    const rows = normalizeNF(rawItems);

    let createdProducts = 0;
    let createdVariants = 0;
    let updatedVariants = 0;
    let supplierUpserts = 0;

    for (const r of rows) {
      // SKU interno tipo CNQ-...
      const internalSku = `CNQ-${r.externalSku}`;

      // slug estable para el producto (por ahora 1 producto por externalId)
      const slug = `nf-${r.externalId}`;

      // 3) upsert Product (no pisamos nombre en update, así podés editarlo luego)
      const existingProduct = await prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });

      const product = await prisma.product.upsert({
        where: { slug },
        update: {
          active: true,
        },
        create: {
          slug,
          name: r.name || `NF ${r.externalId}`,
          active: true,
        },
        select: { id: true },
      });

      if (!existingProduct) createdProducts++;

      // 4) upsert Variant por sku interno + actualizar stock
      const existingVariant = await prisma.productVariant.findUnique({
        where: { sku: internalSku },
        select: { id: true },
      });

      const variant = await prisma.productVariant.upsert({
        where: { sku: internalSku },
        update: {
          stock: r.supplierStock ?? 0,
        },
        create: {
          productId: product.id,
          sku: internalSku,
          colorName: "-", // después lo refinamos cuando sepamos cómo viene color/variación real
          colorHex: null,
          stock: r.supplierStock ?? 0,
        },
        select: { id: true },
      });

      if (!existingVariant) createdVariants++;
      else updatedVariants++;

      // 5) upsert SupplierProduct por supplier + externalSku
      await prisma.supplierProduct.upsert({
        where: {
          supplierId_externalSku: {
            supplierId: supplier.id,
            externalSku: r.externalSku,
          },
        },
        update: {
          productId: product.id,
          variantId: variant.id,
          externalId: r.externalId,
          supplierStock: r.supplierStock,
          supplierPrice: r.supplierPrice,
          name: r.name,
          lastSyncAt: new Date(),
        },
        create: {
          supplierId: supplier.id,
          productId: product.id,
          variantId: variant.id,
          externalId: r.externalId,
          externalSku: r.externalSku,
          supplierStock: r.supplierStock,
          supplierPrice: r.supplierPrice,
          name: r.name,
          lastSyncAt: new Date(),
        },
      });

      supplierUpserts++;
    }

    return NextResponse.json({
      ok: true,
      useMock,
      page,
      received: rawItems.length,
      rows: rows.length,
      createdProducts,
      createdVariants,
      updatedVariants,
      supplierUpserts,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Sync error" },
      { status: 500 }
    );
  }
}
