import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK"].includes(role)) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const active = Boolean(body.active);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, active: true },
    });

    if (!product) {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    return Response.json({
      ok: true,
      product: updated,
    });
  } catch (error: any) {
    console.error("Error toggle-active producto:", error);
    return Response.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}