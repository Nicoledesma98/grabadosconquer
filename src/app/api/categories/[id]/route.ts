import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

  const name = String(body?.name ?? "").trim();
  const slugRaw = String(body?.slug ?? "").trim();

  if (!name) return Response.json({ error: "Name requerido" }, { status: 400 });

  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) return Response.json({ error: "Slug inválido" }, { status: 400 });

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name, slug },
    });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "No se pudo actualizar (¿slug duplicado?)" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  try {
    await prisma.category.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "No se pudo borrar. Probablemente tiene productos asociados." },
      { status: 400 }
    );
  }
}
