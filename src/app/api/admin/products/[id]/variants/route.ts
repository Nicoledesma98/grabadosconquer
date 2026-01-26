import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productId } = await ctx.params;

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(variants);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || (token as any).role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const sku = String(body.sku ?? "").trim();
  const colorName = String(body.colorName ?? "").trim();
  const colorHex = body.colorHex ? String(body.colorHex).trim() : null;
  const stock = Number.isFinite(Number(body.stock)) ? Math.max(0, Number(body.stock)) : 0;
  const priceOverride =
    body.priceOverride === "" || body.priceOverride == null ? null : Math.max(0, Number(body.priceOverride));

  if (!sku || !colorName) {
    return Response.json({ error: "sku y colorName son obligatorios" }, { status: 400 });
  }

  const created = await prisma.productVariant.create({
    data: { productId, sku, colorName, colorHex, stock, priceOverride },
  });

  return Response.json(created);
}
