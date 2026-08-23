import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const runtime = "nodejs";

// Todos los roles válidos (deben coincidir con el enum de Prisma)
const ALLOWED_ROLES = ["ADMIN", "CUSTOMER", "VENTAS", "STOCK", "REVENDEDOR"] as const;
type Role = typeof ALLOWED_ROLES[number];

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await Promise.resolve(ctx.params as any);
  const targetId = String(params?.id ?? "").trim();

  if (!targetId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Guard: solo ADMIN
  const session = await getServerSession(authOptions);
  const myId = String((session?.user as any)?.id ?? "");
  const myRole = String((session?.user as any)?.role ?? "");

  if (!session || myRole !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // No permitir cambiar el propio rol
  if (myId && myId === targetId) {
    return NextResponse.json(
      { error: "No podés cambiar tu propio rol" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const role = String(body?.role ?? "").toUpperCase();

  // Validar que el rol sea uno de los permitidos
  if (!ALLOWED_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { role: role as any },
  });

  return NextResponse.json({ ok: true });
}