import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.email) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { customerEmail: String(token.email) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { orderBy: { id: "asc" } },
    },
  });

  return Response.json(orders);
}
