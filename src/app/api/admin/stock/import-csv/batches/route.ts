import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK", "VENTAS"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const batches = await prisma.importBatch.findMany({
      where: {
        type: "SALES_MOVEMENTS",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100,
    });

    return NextResponse.json({
      ok: true,
      batches,
    });
  } catch (error: any) {
    console.error("Error listando batches CSV:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}