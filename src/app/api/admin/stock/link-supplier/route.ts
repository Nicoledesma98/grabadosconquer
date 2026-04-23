import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Body = {
  supplierCode?: string;
  productId?: string | null;
  variantId?: string | null;
  externalSku?: string;
  externalId?: string | null;
  name?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK"].includes(role)) {
      return Response.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Body;

    const supplierCode = String(body.supplierCode ?? "").trim().toUpperCase();
    const productId = body.productId ? String(body.productId) : null;
    const variantId = body.variantId ? String(body.variantId) : null;
    const externalSku = String(body.externalSku ?? "").trim().toUpperCase();
    const externalId = body.externalId ? String(body.externalId).trim() : null;
    const name = body.name ? String(body.name).trim() : null;

    if (!supplierCode) {
      return Response.json(
        { error: "Falta supplierCode" },
        { status: 400 }
      );
    }

    if (!externalSku) {
      return Response.json(
        { error: "Falta externalSku" },
        { status: 400 }
      );
    }

    if (!productId && !variantId) {
      return Response.json(
        { error: "Debés indicar productId o variantId" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { code: supplierCode },
    });

    if (!supplier) {
      return Response.json(
        { error: `Proveedor no encontrado: ${supplierCode}` },
        { status: 404 }
      );
    }

    let finalProductId: string | null = productId;
    let finalVariantId: string | null = variantId;
    let finalName = name;

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!variant) {
        return Response.json(
          { error: "Variante no encontrada" },
          { status: 404 }
        );
      }

      finalProductId = variant.productId;
      finalVariantId = variant.id;

      if (!finalName) {
        finalName = `${variant.product.name} - ${variant.colorName || "Sin color"}`;
      }
    } else if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
        },
      });

      if (!product) {
        return Response.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }

      finalProductId = product.id;

      if (!finalName) {
        finalName = product.name;
      }
    }

    const linked = await prisma.supplierProduct.upsert({
      where: {
        supplierId_externalSku: {
          supplierId: supplier.id,
          externalSku,
        },
      },
      update: {
        productId: finalProductId,
        variantId: finalVariantId,
        externalId,
        name: finalName,
        lastSyncAt: new Date(),
      },
      create: {
        supplierId: supplier.id,
        productId: finalProductId,
        variantId: finalVariantId,
        externalSku,
        externalId,
        name: finalName,
        supplierStock: 0,
        lastSyncAt: new Date(),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return Response.json({
      ok: true,
      link: linked,
    });
  } catch (error: any) {
    console.error("Error vinculando proveedor:", error);
    return Response.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}