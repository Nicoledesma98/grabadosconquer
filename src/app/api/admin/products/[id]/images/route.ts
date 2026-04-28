import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id: productId } = await ctx.params;
  const body = await req.json();

  const url = String(body.url ?? "").trim();
  const alt = body.alt ? String(body.alt).trim() : null;

  if (!url) return Response.json({ error: "URL requerida" }, { status: 400 });

  // sort = último + 1
  const last = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { sort: "desc" },
    select: { sort: true },
  });

  const img = await prisma.productImage.create({
    data: { productId, url, alt, sort: (last?.sort ?? 0) + 1 },
    select: { id: true, url: true, alt: true, sort: true },
  });

  return Response.json(img);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id: productId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("imageId");

  if (!imageId) return Response.json({ error: "imageId requerido" }, { status: 400 });

  const img = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { productId: true },
  });

  if (!img || img.productId !== productId) {
    return Response.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  await prisma.productImage.delete({ where: { id: imageId } });
  return Response.json({ ok: true });
}

// set principal: sort = 0 para esa, y reordenamos el resto
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });
  const { id: productId } = await ctx.params;
  const body = await req.json();
  const imageId = String(body.imageId ?? "");

  if (!imageId) return Response.json({ error: "imageId requerido" }, { status: 400 });

  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sort: "asc" },
    select: { id: true },
  });

  if (!images.some((x) => x.id === imageId)) {
    return Response.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  // 0 para principal, el resto 1..n
  let sort = 1;
  for (const img of images) {
    await prisma.productImage.update({
      where: { id: img.id },
      data: { sort: img.id === imageId ? 0 : sort++ },
    });
  }

  return Response.json({ ok: true });
}
