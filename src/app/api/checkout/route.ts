import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();

  const customerName = String(body.customerName ?? "").trim();
  const customerEmail = String(body.customerEmail ?? "").trim();
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;

  const customText = body.customText ? String(body.customText).trim() : null;

  const upload = body.upload ?? null; // ✅ nuevo
  const uploadUrl = upload?.url ? String(upload.url).trim() : null;
  const uploadOriginalName = upload?.originalName ? String(upload.originalName).trim() : null;
  const uploadMimeType = upload?.mimeType ? String(upload.mimeType).trim() : "";

  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName || !customerEmail || items.length === 0) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Totales server-side (no confiar 100% en el cliente)
  const subtotal = items.reduce((acc: number, i: any) => {
    const qty = Math.max(1, Number(i.qty || 1));
    const unitPrice = Math.max(0, Number(i.unitPrice || 0));
    return acc + qty * unitPrice;
  }, 0);

  // ✅ Armamos lista de uploads a crear (texto + archivo si existen)
  const uploadsToCreate: any[] = [];

  if (customText) {
    uploadsToCreate.push({
      type: "TEXT",
      text: customText,
      originalName: "Texto personalizado",
    });
  }

  if (uploadUrl) {
    const type = uploadMimeType.includes("pdf") ? "PDF" : "IMAGE";

    uploadsToCreate.push({
      type,
      url: uploadUrl,
      originalName: uploadOriginalName || undefined,
    });
  }

  const order = await prisma.order.create({
    data: {
      customerName,
      customerEmail,
      customerPhone,
      subtotal,
      shipping: 0,
      total: subtotal,
      items: {
        create: items.map((i: any) => ({
          productId: String(i.productId),
          qty: Math.max(1, Number(i.qty || 1)),
          unitPrice: Math.max(0, Number(i.unitPrice || 0)),
          lineTotal:
            Math.max(1, Number(i.qty || 1)) * Math.max(0, Number(i.unitPrice || 0)),
          productName: String(i.productName),
          productSlug: String(i.productSlug),
        })),
      },

      // ✅ solo crea uploads si hay algo
      uploads: uploadsToCreate.length > 0 ? { create: uploadsToCreate } : undefined,
    },
    select: { id: true },
  });

  return Response.json({ orderId: order.id });
}
