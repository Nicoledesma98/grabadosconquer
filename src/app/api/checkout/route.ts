import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mailer";
import { renderOrderCreatedEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token as any)?.id ?? token?.sub ?? null;

  const body = await req.json();

  const customerName = String(body.customerName ?? "").trim();
  const customerEmail = String(body.customerEmail ?? token?.email ?? "").trim();
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;

  const customText = body.customText ? String(body.customText).trim() : null;
  const upload = body.upload ?? null;
  const uploadUrl = upload?.url ? String(upload.url).trim() : null;
  const uploadOriginalName = upload?.originalName ? String(upload.originalName).trim() : null;
  const uploadMimeType = upload?.mimeType ? String(upload.mimeType).trim() : "";

  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName || !customerEmail || items.length === 0) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Totales server-side
  const subtotal = items.reduce((acc: number, i: any) => {
    const qty = Math.max(1, Number(i.qty || 1));
    const unitPrice = Math.max(0, Number(i.unitPrice || 0));
    return acc + qty * unitPrice;
  }, 0);

  // uploads
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

  // ✅ CREAR PEDIDO (y traer lo necesario para el email)
  const order = await prisma.order.create({
    data: {
      ...(userId ? { userId: String(userId) } : {}), // ✅ solo una vez
      customerName,
      customerEmail,
      customerPhone,
      subtotal,
      shipping: 0,
      total: subtotal,

      items: {
        create: items.map((i: any) => {
          const qty = Math.max(1, Number(i.qty || 1));
          const unitPrice = Math.max(0, Number(i.unitPrice || 0));
          return {
            productId: String(i.productId),
            qty,
            unitPrice,
            lineTotal: qty * unitPrice,
            productName: String(i.productName),
            productSlug: String(i.productSlug),
          };
        }),
      },

      uploads: uploadsToCreate.length > 0 ? { create: uploadsToCreate } : undefined,
    },
    include: {
      items: true,
      uploads: true,
    },
  });

  // ✅ EMAILS (no frenamos el checkout si fallan)
  try {
    const htmlClient = renderOrderCreatedEmail({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      items: order.items.map((it) => ({
        qty: it.qty,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        productName: it.productName,
        productSlug: it.productSlug,
      })),
    });

    await sendMail({
      to: customerEmail,
      subject: `✅ Pedido recibido — ${order.id}`,
      html: htmlClient,
    });

    const internalTo = process.env.MAIL_INTERNAL_TO;
    if (internalTo) {
      await sendMail({
        to: internalTo,
        subject: `🧾 Nuevo pedido — ${order.id}`,
        html: htmlClient, // si querés, después hacemos template interno distinto
      });
    }
  } catch (e) {
    console.error("MAIL_ERROR", e);
  }

  return Response.json({ orderId: order.id });
}
