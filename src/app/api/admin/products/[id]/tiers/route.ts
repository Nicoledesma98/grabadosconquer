import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id: productId } = await ctx.params;
  const body = await req.json();

  const minQty = Number(body.minQty);
  const price = Number(body.price);

  if (!Number.isFinite(minQty) || minQty < 1) {
    return Response.json({ error: "minQty inválido" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "price inválido" }, { status: 400 });
  }

  try {
    const tier = await prisma.priceTier.create({
      data: { productId, minQty: Math.floor(minQty), price: Math.round(price) },
      select: { id: true, minQty: true, price: true },
    });
    return Response.json(tier);
  } catch (e: any) {
    // unique (productId, minQty)
    return Response.json({ error: "Ya existe un tier con ese minQty" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id: productId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get("tierId");

  if (!tierId) return Response.json({ error: "tierId requerido" }, { status: 400 });

  // seguridad: borramos solo si pertenece al producto
  const tier = await prisma.priceTier.findUnique({ where: { id: tierId }, select: { productId: true } });
  if (!tier || tier.productId !== productId) {
    return Response.json({ error: "Tier no encontrado" }, { status: 404 });
  }

  await prisma.priceTier.delete({ where: { id: tierId } });
  return Response.json({ ok: true });
}
