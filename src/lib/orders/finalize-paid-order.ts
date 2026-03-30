import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { renderOrderCreatedEmail } from "@/lib/email/templates";

export async function finalizePaidOrder(orderId: string) {
  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, uploads: true },
    });

    if (!existing) {
      throw new Error("Pedido no encontrado");
    }

    if (existing.status === "PAID") {
      return existing;
    }

    const variantQty = new Map<string, number>();
    const productQty = new Map<string, number>();

    for (const item of existing.items) {
      if (item.variantId) {
        variantQty.set(
          item.variantId,
          (variantQty.get(item.variantId) ?? 0) + item.qty
        );
      } else {
        productQty.set(
          item.productId,
          (productQty.get(item.productId) ?? 0) + item.qty
        );
      }
    }

    // Descontar stock de variantes
    for (const [variantId, qty] of variantQty.entries()) {
      const upd = await tx.productVariant.updateMany({
        where: {
          id: variantId,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (upd.count === 0) {
        throw new Error(`Stock insuficiente en variante ${variantId}`);
      }
    }

    // Descontar stock de productos simples
    for (const [productId, qty] of productQty.entries()) {
      const upd = await tx.product.updateMany({
        where: {
          id: productId,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (upd.count === 0) {
        throw new Error(`Stock insuficiente en producto ${productId}`);
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
      include: { items: true, uploads: true },
    });

    return updated;
  });

  try {
    const htmlClient = renderOrderCreatedEmail({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,

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
      })),
    });

    if (order.customerEmail) {
      await sendMail({
        to: order.customerEmail,
        subject: `✅ Pago confirmado — ${order.id}`,
        html: htmlClient,
      });
    }

    const internalTo = process.env.MAIL_INTERNAL_TO;
    if (internalTo) {
      await sendMail({
        to: internalTo,
        subject: `💰 Pedido pagado — ${order.id}`,
        html: htmlClient,
      });
    }
  } catch (e) {
    console.error("EMAIL_AFTER_PAYMENT_ERROR", e);
  }

  return order;
}