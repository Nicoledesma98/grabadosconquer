import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  // ✅ Next 16: params puede ser Promise
  const params = await Promise.resolve(ctx.params as any);
  const targetId = String(params?.id ?? "").trim();

  if (!targetId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // ✅ Guard: solo ADMIN (igual que en tus pages)
  const session = await getServerSession(authOptions);
  const myId = String((session?.user as any)?.id ?? "");
  const myRole = String((session?.user as any)?.role ?? "");

  if (!session || myRole !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // ✅ Evitar que el admin se cambie a sí mismo
  if (myId && myId === targetId) {
    return NextResponse.json(
      { error: "No podés cambiar tu propio rol" },
      { status: 400 }
    );
  }

  // Body
  const body = await req.json().catch(() => ({}));
  const role = String(body?.role ?? "").toUpperCase();

  if (role !== "ADMIN" && role !== "CUSTOMER") {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { role: role as any },
  });

  return NextResponse.json({ ok: true });
}
