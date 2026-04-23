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
  const parentId = body?.parentId ? String(body.parentId) : null;

  if (!name) return Response.json({ error: "Name requerido" }, { status: 400 });

  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) return Response.json({ error: "Slug inválido" }, { status: 400 });

  if (parentId === id) {
    return Response.json(
      { error: "Una categoría no puede ser hija de sí misma" },
      { status: 400 }
    );
  }

  if (parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { id: true },
    });

    if (!parent) {
      return Response.json({ error: "Categoría padre no encontrada" }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        image: body.image || null,
        parentId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return Response.json(updated);
  } catch {
    return Response.json(
      { error: "No se pudo actualizar (¿slug duplicado?)" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const { id } = await ctx.params;

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: { select: { id: true }, take: 1 },
        children: { select: { id: true }, take: 1 },
      },
    });

    if (!category) {
      return Response.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    if (category.products.length > 0) {
      return Response.json(
        { error: "No se puede eliminar la categoría porque tiene productos asociados." },
        { status: 400 }
      );
    }

    if (category.children.length > 0) {
      return Response.json(
        { error: "No se puede eliminar la categoría porque tiene subcategorías asociadas." },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return Response.json(
      { error: "Error interno al eliminar la categoría" },
      { status: 500 }
    );
  }
}