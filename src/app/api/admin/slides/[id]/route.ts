import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

async function requireAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as any)?.role;
  if (!token) return { ok: false, status: 401, error: "No autenticado" };
  if (role !== "ADMIN") return { ok: false, status: 403, error: "Sin permisos" };
  return { ok: true as const };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.imageUrl != null) data.imageUrl = String(body.imageUrl).trim();
  if (body.title != null) data.title = String(body.title).trim();
  if ("subtitle" in body) data.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
  if (body.active != null) data.active = Boolean(body.active);
  if (body.order != null) data.order = Number(body.order);
  if ("primaryLabel" in body) data.primaryLabel = body.primaryLabel ? String(body.primaryLabel).trim() : null;
  if ("primaryUrl" in body) data.primaryUrl = body.primaryUrl ? String(body.primaryUrl).trim() : null;
  if ("secondaryLabel" in body) data.secondaryLabel = body.secondaryLabel ? String(body.secondaryLabel).trim() : null;
  if ("secondaryUrl" in body) data.secondaryUrl = body.secondaryUrl ? String(body.secondaryUrl).trim() : null;

  if (data.imageUrl === "") return Response.json({ error: "La imagen es requerida" }, { status: 400 });
  if (data.title === "") return Response.json({ error: "El título es requerido" }, { status: 400 });

  try {
    const updated = await prisma.homeSlide.update({ where: { id }, data });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Slide no encontrado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  try {
    await prisma.homeSlide.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Slide no encontrado" }, { status: 404 });
  }
}
