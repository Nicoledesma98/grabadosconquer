import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ variantId: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.sku != null) data.sku = String(body.sku).trim();
  if (body.colorName != null) data.colorName = String(body.colorName).trim();
  if (body.colorHex != null) data.colorHex = body.colorHex ? String(body.colorHex).trim() : null;
  if (body.stock != null) data.stock = Math.max(0, Number(body.stock));
  if (body.priceOverride != null)
    data.priceOverride = body.priceOverride === "" ? null : Math.max(0, Number(body.priceOverride));

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data,
  });

  return Response.json(updated);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ variantId: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { variantId } = await ctx.params;

  await prisma.productVariant.delete({ where: { id: variantId } });
  return Response.json({ ok: true });
}
