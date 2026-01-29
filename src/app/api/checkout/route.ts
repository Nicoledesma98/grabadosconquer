import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mailer";
import { renderOrderCreatedEmail } from "@/lib/email/templates";

export const runtime = "nodejs";

const VAT_RATE = 21;      // %
const MP_RATE = 0.10;     // 10%

const MOTO_PRICES: Record<string, number> = {
  CABA: 4500,
  GBA1: 6500,
  GBA2: 8500,
};

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token as any)?.id ?? token?.sub ?? null;

  const body = await req.json();

  const customerName = String(body.customerName ?? "").trim();
  const customerEmail = String(body.customerEmail ?? token?.email ?? "").trim();
  const customerPhone = body.customerPhone ? String(body.customerPhone).trim() : null;

  const items = Array.isArray(body.items) ? body.items : [];
  if (!customerName || !customerEmail || items.length === 0) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  // -------------------------
  // Personalización uploads
  // -------------------------
  const customText = body.customText ? String(body.customText).trim() : null;
  const upload = body.upload ?? null;
  const uploadUrl = upload?.url ? String(upload.url).trim() : null;
  const uploadOriginalName = upload?.originalName ? String(upload.originalName).trim() : null;
  const uploadMimeType = upload?.mimeType ? String(upload.mimeType).trim() : "";

  const uploadsToCreate: any[] = [];

  if (customText) {
    uploadsToCreate.push({
      type: "TEXT",
      text: customText,
      originalName: "Texto personalizado",
    });
  }

  if (uploadUrl) {
    const mt = (uploadMimeType || "").toLowerCase();
    const type =
      mt.includes("pdf") ? "PDF" :
      mt.includes("word") || mt.includes("doc") ? "DOC" :
      mt.startsWith("image/") ? "IMAGE" : "OTHER";

    uploadsToCreate.push({
      type,
      url: uploadUrl,
      originalName: uploadOriginalName || undefined,
    });
  }

  // -------------------------
  // Shipping / Address
  // -------------------------
  const shippingMethod = String(body.shippingMethod ?? "PICKUP"); // PICKUP | MOTO | OCA | VIACARGO
  const motoZone = body.motoZone ? String(body.motoZone) : null;

  let shipping = 0;
  if (shippingMethod === "MOTO") {
    shipping = MOTO_PRICES[motoZone ?? ""] ?? 0;
  } else if (shippingMethod === "PICKUP") {
    shipping = 0;
  } else {
    // MVP: OCA / VIACARGO aún sin cálculo
    shipping = 0;
  }

  const shipPostalCode = body.shipPostalCode ? String(body.shipPostalCode).trim() : null;
  const shipStreet = body.shipStreet ? String(body.shipStreet).trim() : null;
  const shipNumber = body.shipNumber ? String(body.shipNumber).trim() : null;
  const shipApartment = body.shipApartment ? String(body.shipApartment).trim() : null;

  // -------------------------
  // Invoice
  // -------------------------
  const invoiceType = String(body.invoiceType ?? "B"); // A | B
  const invoiceCuit = body.invoiceCuit ? String(body.invoiceCuit).trim() : null;
  const invoiceBusinessName = body.invoiceBusinessName ? String(body.invoiceBusinessName).trim() : null;

  // -------------------------
  // Payment
  // -------------------------
  const paymentMethod = String(body.paymentMethod ?? "CASH"); // MERCADO_PAGO | CASH | TRANSFER | COORDINATE

  // -------------------------
  // Totales server-side (NETO + IVA + ENVIO + RECARGO)
  // unitPrice = NETO
  // -------------------------
  const subtotalNet = items.reduce((acc: number, i: any) => {
    const qty = Math.max(1, Number(i.qty || 1));
    const unitPrice = Math.max(0, Number(i.unitPrice || 0));
    return acc + qty * unitPrice;
  }, 0);

  const vatRate = VAT_RATE;
  const vatAmount = Math.round(subtotalNet * vatRate / 100);

  const baseTotal = subtotalNet + vatAmount + shipping;
  const paymentSurcharge =
    paymentMethod === "MERCADO_PAGO" ? Math.round(baseTotal * MP_RATE) : 0;

  const total = baseTotal + paymentSurcharge;

  // -------------------------
  // Crear pedido
  // -------------------------
  const order = await prisma.order.create({
    data: {
      ...(userId ? { userId: String(userId) } : {}),
      customerName,
      customerEmail,
      customerPhone,

      // ✅ nuevos campos
      subtotalNet,
      vatRate,
      vatAmount,
      shipping,

      paymentMethod: paymentMethod as any,
      paymentSurcharge,
      total,

      invoiceType: invoiceType as any,
      invoiceCuit,
      invoiceBusinessName,

      shippingMethod: shippingMethod as any,
      motoZone: motoZone ? (motoZone as any) : null,
      shipPostalCode,
      shipStreet,
      shipNumber,
      shipApartment,

      items: {
        create: items.map((i: any) => ({
          productId: String(i.productId),
          qty: Math.max(1, Number(i.qty || 1)),
          unitPrice: Math.max(0, Number(i.unitPrice || 0)), // neto
          lineTotal:
            Math.max(1, Number(i.qty || 1)) * Math.max(0, Number(i.unitPrice || 0)),
          productName: String(i.productName),
          productSlug: String(i.productSlug),

          variantId: i.variantId ? String(i.variantId) : null,
          variantSku: i.variantSku ? String(i.variantSku) : null,
          colorName: i.colorName ? String(i.colorName) : null,
          colorHex: i.colorHex ? String(i.colorHex) : null,

          method: i.method ?? null,
          notes: i.notes ? String(i.notes) : null,
        })),
      },

      uploads: uploadsToCreate.length > 0 ? { create: uploadsToCreate } : undefined,
    },
    include: { items: true, uploads: true },
  });

  // -------------------------
  // Emails
  // (si tu template aún no muestra IVA/recargo, igual lo podés mandar)
  // -------------------------
  try {
    const htmlClient = renderOrderCreatedEmail({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,

      // si tu template todavía usa "subtotal", mandale subtotalNet por ahora
      subtotalNet: order.subtotalNet,
      vatRate: order.vatRate,
      vatAmount: order.vatAmount,
      shipping: order.shipping,
      paymentSurcharge: order.paymentSurcharge,
      total: order.total,

      paymentMethod: order.paymentMethod,
      shippingMethod: order.shippingMethod,
      motoZone: order.motoZone,

      invoiceType: order.invoiceType,
      invoiceCuit: order.invoiceCuit,
      invoiceBusinessName: order.invoiceBusinessName,

      items: order.items.map((it) => ({
        qty: it.qty,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        productName: it.productName,
        productSlug: it.productSlug,
        colorName: it.colorName,
        colorHex: it.colorHex,
        variantSku: it.variantSku,
        method: it.method,
        notes: it.notes,
      })),
      uploads: order.uploads.map((u) => ({
        type: u.type,
        url: u.url ?? null,
        text: u.text ?? null,
        originalName: u.originalName ?? null,
      }))
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
        html: htmlClient,
      });
    }
  } catch (e) {
    console.error("MAIL_ERROR", e);
  }

  return Response.json({
    orderId: order.id,
    paymentMethod: order.paymentMethod,
    total: order.total,
  });
}
