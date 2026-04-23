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

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
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
        orderBy: { name: "asc" },
      },
      _count: { select: { products: true } },
    },
  });

  return Response.json(categories);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));

  const name = String(body?.name ?? "").trim();
  const slugRaw = String(body?.slug ?? "").trim();
  const parentId = body?.parentId ? String(body.parentId) : null;

  if (!name) return Response.json({ error: "Name requerido" }, { status: 400 });

  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) return Response.json({ error: "Slug inválido" }, { status: 400 });

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
    const created = await prisma.category.create({
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

    return Response.json(created, { status: 201 });
  } catch (e: any) {
    return Response.json(
      { error: "No se pudo crear (¿slug duplicado?)" },
      { status: 400 }
    );
  }
}