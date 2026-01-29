import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const url = body?.url ? String(body.url).trim() : "";
  const originalName = body?.originalName ? String(body.originalName).trim() : null;

  if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  const upload = await prisma.orderUpload.create({
    data: {
      orderId,
      type: "PAYMENT_PROOF",
      url,
      originalName: originalName || "Comprobante de transferencia",
    },
    select: { id: true },
  });

  return Response.json({ ok: true, uploadId: upload.id });
}
