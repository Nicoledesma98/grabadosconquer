import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK"].includes(role)) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            sku: true,
            colorName: true,
            stock: true,
          },
        },
      },
    });

    return Response.json({ ok: true, products });
  } catch (error: any) {
    console.error("Error cargando productos para vincular:", error);
    return Response.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}