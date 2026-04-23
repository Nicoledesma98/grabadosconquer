import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Body = {
  productId?: string | null;
  variantId?: string | null;
  quantity?: number;
  notes?: string | null;
};

function sanitizeNotes(input: unknown, maxLength = 500) {
  return String(input ?? "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLength);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = (token as any)?.id ?? null;
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK"].includes(role)) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    const productId = body.productId ? String(body.productId) : null;
    const variantId = body.variantId ? String(body.variantId) : null;
    const quantity = Number(body.quantity ?? 0);
    const notes = sanitizeNotes(body.notes);

    if (!productId && !variantId) {
      return Response.json(
        { error: "Debés indicar productId o variantId" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return Response.json(
        { error: "La cantidad debe ser un entero mayor a 0" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        if (!variant) {
          throw new Error("Variante no encontrada");
        }

        const previousStock = variant.stock ?? 0;

        if (previousStock < quantity) {
          throw new Error(
            `Stock insuficiente en la variante. Disponible: ${previousStock}`
          );
        }

        const newStock = previousStock - quantity;

        const updatedVariant = await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });

        const movement = await tx.stockMovement.create({
          data: {
            movementType: "OUT",
            source: "OWN",
            quantity,
            previousStock,
            newStock,
            notes: notes || "Egreso manual de mercadería",
            createdById: userId,
            productId: variant.productId,
            variantId: variant.id,
          },
        });

        return {
          kind: "variant" as const,
          movementId: movement.id,
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          productSlug: variant.product.slug,
          variantSku: variant.sku,
          variantColor: variant.colorName,
          previousStock,
          newStock,
          updatedVariantId: updatedVariant.id,
        };
      }

      const product = await tx.product.findUnique({
        where: { id: productId! },
        include: {
          variants: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!product) {
        throw new Error("Producto no encontrado");
      }

      if (product.variants.length > 0) {
        throw new Error(
          "Este producto tiene variantes. Debés descontar stock sobre una variante."
        );
      }

      const previousStock = product.stock ?? 0;

      if (previousStock < quantity) {
        throw new Error(
          `Stock insuficiente en el producto. Disponible: ${previousStock}`
        );
      }

      const newStock = previousStock - quantity;

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: quantity,
          },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          movementType: "OUT",
          source: "OWN",
          quantity,
          previousStock,
          newStock,
          notes: notes || "Egreso manual de mercadería",
          createdById: userId,
          productId: product.id,
        },
      });

      return {
        kind: "product" as const,
        movementId: movement.id,
        productId: product.id,
        variantId: null,
        productName: product.name,
        productSlug: product.slug,
        previousStock,
        newStock,
        updatedProductId: updatedProduct.id,
      };
    });

    return Response.json({
      ok: true,
      result,
    });
  } catch (error: any) {
    console.error("Error en egreso manual de stock:", error);
    return Response.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}