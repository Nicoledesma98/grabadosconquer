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

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const slides = await prisma.homeSlide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(slides);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return Response.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => ({}));

  const imageUrl = String(body?.imageUrl ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const subtitle = body?.subtitle ? String(body.subtitle).trim() : null;
  const active = body?.active !== false;
  const primaryLabel = body?.primaryLabel ? String(body.primaryLabel).trim() : null;
  const primaryUrl = body?.primaryUrl ? String(body.primaryUrl).trim() : null;
  const secondaryLabel = body?.secondaryLabel ? String(body.secondaryLabel).trim() : null;
  const secondaryUrl = body?.secondaryUrl ? String(body.secondaryUrl).trim() : null;

  if (!imageUrl) return Response.json({ error: "La imagen es requerida" }, { status: 400 });
  if (!title) return Response.json({ error: "El título es requerido" }, { status: 400 });

  const last = await prisma.homeSlide.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.homeSlide.create({
    data: {
      imageUrl,
      title,
      subtitle,
      active,
      primaryLabel,
      primaryUrl,
      secondaryLabel,
      secondaryUrl,
      order: (last?.order ?? -1) + 1,
    },
  });

  return Response.json(created, { status: 201 });
}
