import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { renderOrderCreatedEmail } from "@/lib/email/templates";
import { sendMetaCapiEvent } from "@/lib/meta-capi";

export async function finalizePaidOrder(orderId: string) {
  const order = await prisma.$transaction(
    async (tx) => {
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

      // ---------------------------------
      // Variantes
      // Regla:
      // - si alcanza stock propio => descontar de propio
      // - si NO alcanza stock propio => descontar TODO del proveedor
      // ---------------------------------
      for (const [variantId, qty] of variantQty.entries()) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: {
            supplierMaps: true,
            product: true,
          },
        });

        if (!variant) {
          throw new Error(`Variante no encontrada ${variantId}`);
        }

        const ownStock = variant.stock ?? 0;
        const supplierStockTotal = variant.supplierMaps.reduce(
          (sum, s) => sum + (s.supplierStock ?? 0),
          0
        );

        const available = ownStock + supplierStockTotal;

        if (available < qty) {
          throw new Error(`Stock insuficiente en variante ${variantId}`);
        }

        // Caso 1: alcanza stock propio => descontar de propio
        if (ownStock >= qty) {
          const newStock = ownStock - qty;

          await tx.productVariant.update({
            where: { id: variantId },
            data: {
              stock: {
                decrement: qty,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              productId: variant.productId,
              source: "OWN",
              movementType: "OUT",
              quantity: qty,
              previousStock: ownStock,
              newStock,
              orderId,
              notes: `Descuento por pedido pagado ${orderId}`,
            },
          });
        } else {
          // Caso 2: no alcanza propio => descontar TODO del proveedor
          let pending = qty;

          for (const sm of variant.supplierMaps) {
            if (pending <= 0) break;

            const currentSupplierStock = sm.supplierStock ?? 0;
            if (currentSupplierStock <= 0) continue;

            const supplierToDiscount = Math.min(currentSupplierStock, pending);
            const newSupplierStock = currentSupplierStock - supplierToDiscount;

            await tx.supplierProduct.update({
              where: { id: sm.id },
              data: {
                supplierStock: {
                  decrement: supplierToDiscount,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                productId: variant.productId,
                source: "SUPPLIER",
                movementType: "OUT",
                quantity: supplierToDiscount,
                previousStock: currentSupplierStock,
                newStock: newSupplierStock,
                orderId,
                notes: `Descuento stock proveedor por pedido pagado ${orderId}`,
              },
            });

            pending -= supplierToDiscount;
          }

          if (pending > 0) {
            throw new Error(
              `No se pudo descontar stock proveedor para variante ${variantId}`
            );
          }
        }
      }

      // ---------------------------------
      // Productos simples
      // Misma regla
      // ---------------------------------
      for (const [productId, qty] of productQty.entries()) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: {
            supplierMap: true,
          },
        });

        if (!product) {
          throw new Error(`Producto no encontrado ${productId}`);
        }

        const ownStock = product.stock ?? 0;
        const supplierStockTotal = product.supplierMap.reduce(
          (sum, s) => sum + (s.supplierStock ?? 0),
          0
        );

        const available = ownStock + supplierStockTotal;

        if (available < qty) {
          throw new Error(`Stock insuficiente en producto ${productId}`);
        }

        // Caso 1: alcanza stock propio => descontar de propio
        if (ownStock >= qty) {
          const newStock = ownStock - qty;

          await tx.product.update({
            where: { id: productId },
            data: {
              stock: {
                decrement: qty,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              source: "OWN",
              movementType: "OUT",
              quantity: qty,
              previousStock: ownStock,
              newStock,
              orderId,
              notes: `Descuento por pedido pagado ${orderId}`,
            },
          });
        } else {
          // Caso 2: no alcanza propio => descontar TODO del proveedor
          let pending = qty;

          for (const sm of product.supplierMap) {
            if (pending <= 0) break;

            const currentSupplierStock = sm.supplierStock ?? 0;
            if (currentSupplierStock <= 0) continue;

            const supplierToDiscount = Math.min(currentSupplierStock, pending);
            const newSupplierStock = currentSupplierStock - supplierToDiscount;

            await tx.supplierProduct.update({
              where: { id: sm.id },
              data: {
                supplierStock: {
                  decrement: supplierToDiscount,
                },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: product.id,
                source: "SUPPLIER",
                movementType: "OUT",
                quantity: supplierToDiscount,
                previousStock: currentSupplierStock,
                newStock: newSupplierStock,
                orderId,
                notes: `Descuento stock proveedor por pedido pagado ${orderId}`,
              },
            });

            pending -= supplierToDiscount;
          }

          if (pending > 0) {
            throw new Error(
              `No se pudo descontar stock proveedor para producto ${productId}`
            );
          }
        }
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
        include: { items: true, uploads: true },
      });

      return updated;
    },
   {
     maxWait: 10000,
     timeout: 30000,
   }
  );

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

  try {
    const appUrl = process.env.APP_URL || "https://grabadosconquer.com.ar";

    await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: order.id,
      eventSourceUrl: `${appUrl}/gracias/${order.id}`,
      user: {
        email: order.customerEmail,
        phone: order.customerPhone,
        fullName: order.customerName,
        city: order.shipLocality,
        zip: order.shipPostalCode,
        country: "ar",
      },
      customData: {
        currency: "ARS",
        value: order.total,
        content_ids: order.items.map((it) => it.variantSku || it.productId),
        content_type: "product",
        num_items: order.items.reduce((acc, it) => acc + it.qty, 0),
      },
    });
  } catch (e) {
    console.error("META_CAPI_PURCHASE_ERROR", e);
  }

  return order;
}