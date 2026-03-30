import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { sendMail } from "@/lib/mailer";
import { renderOrderCreatedEmail } from "@/lib/email/templates";
import { getMotoFromLocality, MotoZone } from "@/lib/shipping/moto";

export const runtime = "nodejs";

const VAT_RATE = 21;      // %
const MP_RATE = 0.10;     // 10%

// Función para sanitizar strings
function sanitizeString(str: string, maxLength: number = 255): string {
  let sanitized = str
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, maxLength);
  return sanitized;
}

// Función para validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar teléfono
function isValidPhone(phone: string): boolean {
  if (!phone.trim()) return true;
  const phoneRegex = /^[0-9\s\-\+\(\)]{6,20}$/;
  return phoneRegex.test(phone);
}

// Función para validar CUIT (acepta con o sin guiones)
function isValidCUIT(cuit: string): boolean {
  if (!cuit) return false;
  
  // Limpiar guiones y espacios
  const cleanedCuit = cuit.replace(/[-\s]/g, '');
  
  // Debe tener 11 dígitos
  if (!/^\d{11}$/.test(cleanedCuit)) return false;
  
  // Validación básica de formato (opcional)
  return true;
}

// Función para formatear CUIT (agrega guiones)
function formatCUIT(cuit: string): string {
  const cleaned = cuit.replace(/[-\s]/g, '');
  if (cleaned.length !== 11) return cuit;
  
  return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 10)}-${cleaned.substring(10)}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = (token as any)?.id ?? token?.sub ?? null;

    const body = await req.json();

    // Sanitizar y validar datos del cliente
    const customerName = sanitizeString(String(body.customerName ?? ""));
    const customerEmail = sanitizeString(String(body.customerEmail ?? token?.email ?? ""));
    const customerPhone = body.customerPhone ? sanitizeString(String(body.customerPhone)) : null;

    // Validaciones básicas
    if (!customerName || customerName.length < 2) {
      return Response.json({ 
        error: "El nombre debe tener al menos 2 caracteres",
        field: "name"
      }, { status: 400 });
    }

    if (!customerEmail || !isValidEmail(customerEmail)) {
      return Response.json({ 
        error: "Email inválido",
        field: "email"
      }, { status: 400 });
    }

    if (customerPhone && !isValidPhone(customerPhone)) {
      return Response.json({ 
        error: "Teléfono inválido",
        field: "phone"
      }, { status: 400 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
        
    if (items.length === 0) {
      return Response.json({ 
        error: "El carrito está vacío",
        field: "cart"
      }, { status: 400 });
    }

    // Validar cada item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId || typeof item.productId !== 'string') {
        return Response.json({ 
          error: `Item ${i + 1}: productId inválido`,
          field: `item_${i}_productId`
        }, { status: 400 });
      }
      
      const qty = Number(item.qty || 1);
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
        return Response.json({ 
          error: `Item ${i + 1}: cantidad inválida (debe ser entre 1 y 999)`,
          field: `item_${i}_qty`
        }, { status: 400 });
      }
      
      const unitPrice = Number(item.unitPrice || 0);
      if (isNaN(unitPrice) || unitPrice < 0) {
        return Response.json({ 
          error: `Item ${i + 1}: precio unitario inválido`,
          field: `item_${i}_unitPrice`
        }, { status: 400 });
      }
    }

    // -------------------------
    // Personalización uploads
    // -------------------------
    const customText = body.customText ? sanitizeString(String(body.customText), 1000) : null;
    const upload = body.upload ?? null;
    const uploadUrl = upload?.url ? String(upload.url).trim() : null;
    const uploadOriginalName = upload?.originalName ? sanitizeString(String(upload.originalName)) : null;
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
      // Validación más flexible de URL
      try {
        // Intentar crear URL absoluta
        const urlObj = new URL(uploadUrl);
        // Si es una URL relativa (empieza con /), es válida
      } catch (error) {
        // Si falla new URL(), verificar si es una URL relativa
        if (!uploadUrl.startsWith('/')) {
          return Response.json({ 
            error: "URL de archivo inválida. Debe ser una URL absoluta o relativa.",
            field: "upload"
          }, { status: 400 });
        }
      }

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
    const shippingMethod = String(body.shippingMethod ?? "PICKUP");
    const shipLocality = body.shipLocality ? sanitizeString(String(body.shipLocality)) : null;
    const shipStreet = body.shipStreet ? sanitizeString(String(body.shipStreet)) : null;
    const shipNumber = body.shipNumber ? sanitizeString(String(body.shipNumber)) : null;
    const shipApartment = body.shipApartment ? sanitizeString(String(body.shipApartment)) : null;

    let motoZone: MotoZone | null = null;
    let shipping = 0;

    if (shippingMethod === "MOTO") {
      const z = String(body.motoZone ?? "") as MotoZone;
      const loc = String(body.motoLocality ?? "").trim();

      if (!loc) {
        return Response.json({ 
          error: "Debe seleccionar una localidad para envío en moto",
          field: "motoLocality"
        }, { status: 400 });
      }

      const info = getMotoFromLocality(z, loc);
      if (!info) {
        return Response.json({ 
          error: "Localidad no habilitada para envío en moto",
          field: "motoLocality"
        }, { status: 400 });
      }

      motoZone = info.zone;
      shipping = info.price;

      if (!shipStreet || !shipNumber) {
        return Response.json({ 
          error: "Dirección incompleta para envío",
          field: shipStreet ? "shipNumber" : "shipStreet"
        }, { status: 400 });
      }
    } else if (shippingMethod === "PICKUP") {
      shipping = 0;
    } else {
      shipping = 0;
    }
    const shipPostalCode = body.shipPostalCode ? String(body.shipPostalCode).trim() : null;

    // -------------------------
    // Invoice
    // -------------------------
    const invoiceType = String(body.invoiceType ?? "B");
    let invoiceCuit = body.invoiceCuit ? String(body.invoiceCuit).trim() : null;
    const invoiceBusinessName = body.invoiceBusinessName ? sanitizeString(String(body.invoiceBusinessName)) : null;

    // Validar facturación
    if (invoiceType === "A") {
      if (!invoiceCuit) {
        return Response.json({ 
          error: "CUIT requerido para factura A",
          field: "invoiceCuit"
        }, { status: 400 });
      }
      
      if (!isValidCUIT(invoiceCuit)) {
        return Response.json({ 
          error: "CUIT inválido. Formato: 30-12345678-9 o 30123456789",
          field: "invoiceCuit"
        }, { status: 400 });
      }
      
      // Formatear CUIT con guiones para consistencia
      invoiceCuit = formatCUIT(invoiceCuit);
      
      if (!invoiceBusinessName || invoiceBusinessName.length < 3) {
        return Response.json({ 
          error: "Razón social requerida para factura A (mínimo 3 caracteres)",
          field: "invoiceBusinessName"
        }, { status: 400 });
      }
    }

    // -------------------------
    // Payment
    // -------------------------
    const paymentMethod = String(body.paymentMethod ?? "CASH");
    if (paymentMethod === "CASH" && shippingMethod !== "PICKUP") {
      return Response.json({ 
        error: "Pago en efectivo solo disponible para retiro en local",
        field: "paymentMethod"
      }, { status: 400 });
      
    }
    if (paymentMethod === "MERCADO_PAGO") {
  return Response.json(
    { error: "Mercado Pago está temporalmente no disponible" },
    { status: 400 }
  );
}

    // -------------------------
    // Totales server-side
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
    // Validar stock real antes de crear pedido
    // -------------------------
    for (const i of items) {
      const qty = Math.max(1, Number(i.qty || 1));
      const variantId = i.variantId ? String(i.variantId) : null;
      const productId = String(i.productId);

      if (variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });

        if (!variant) {
          return Response.json(
            { error: "Variante no encontrada", field: "variant" },
            { status: 400 }
          );
        }

        if (variant.stock < qty) {
          return Response.json(
            {
              error: `Stock insuficiente para "${variant.product.name}". Disponible: ${variant.stock}, solicitado: ${qty}`,
              field: "stock",
            },
            { status: 400 }
          );
        }
      } else {
        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        if (!product) {
          return Response.json(
            { error: "Producto no encontrado", field: "product" },
            { status: 400 }
          );
        }

        const stock = product.stock ?? 0;

        if (stock < qty) {
          return Response.json(
            {
              error: `Stock insuficiente para "${product.name}". Disponible: ${stock}, solicitado: ${qty}`,
              field: "stock",
            },
            { status: 400 }
          );
        }
      }
    }
    // -------------------------
    // Crear pedido PENDIENTE
    // -------------------------
    const order = await prisma.order.create({
      data: {
        ...(userId ? { userId: String(userId) } : {}),
        status: "PENDING",

        customerName,
        customerEmail,
        customerPhone,
        shipLocality,
        shipPostalCode,

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
        shipStreet,
        shipNumber,
        shipApartment,

        items: {
          create: items.map((i: any) => ({
            productId: String(i.productId),
            qty: Math.max(1, Number(i.qty || 1)),
            unitPrice: Math.max(0, Number(i.unitPrice || 0)),
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
    // Emails SOLO para métodos manuales
    // -------------------------
    const isMercadoPago = paymentMethod === "MERCADO_PAGO";

    if (!isMercadoPago) {
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

        await sendMail({
          to: customerEmail,
          subject: `🧾 Pedido recibido — ${order.id} (pendiente de confirmación)`,
          html: htmlClient,
        });

        const internalTo = process.env.MAIL_INTERNAL_TO;
        if (internalTo) {
          await sendMail({
            to: internalTo,
            subject: `🧾 Nuevo pedido pendiente — ${order.id}`,
            html: htmlClient,
          });
        }
      } catch (e: any) {
        console.error("EMAIL_ERROR", e);
      }
    }

    return Response.json({
      success: true,
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      total: order.total,
      status: order.status,
    });

  } catch (error: any) {
    console.error("Error en checkout:", error);
    
    // Manejo de errores específicos de transacción
    if (error.message.includes("OUT_OF_STOCK") || error.message.includes("Stock insuficiente")) {
      return Response.json({ 
        error: error.message,
        field: "stock"
      }, { status: 400 });
    }
    
    if (error.message.includes("Variante no encontrada")) {
      return Response.json({ 
        error: error.message,
        field: "variant"
      }, { status: 400 });
    }
    
    return Response.json({ 
      error: error.message || "Error interno del servidor",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}