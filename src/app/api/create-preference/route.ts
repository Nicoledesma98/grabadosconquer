import { MercadoPagoConfig, Preference } from "mercadopago";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
    }

    const baseUrl = process.env.APP_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Falta APP_URL" },
        { status: 500 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "El pedido ya no está pendiente" },
        { status: 400 }
      );
    }

    if (!order.customerEmail) {
      return NextResponse.json(
        { error: "El pedido no tiene email del cliente" },
        { status: 400 }
      );
    }

    const mpItems: {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
}[] = [
  ...order.items.map((item) => ({
    id: item.productId,
    title: item.productName,
    quantity: item.qty,
    unit_price: item.unitPrice,
    currency_id: "ARS" as const,
  })),
];

// IVA
if (order.vatAmount > 0) {
  mpItems.push({
    id: "order-vat",
    title: `IVA (${order.vatRate}%)`,
    quantity: 1,
    unit_price: order.vatAmount,
    currency_id: "ARS",
  });
}

// Envío
if (order.shipping > 0) {
  mpItems.push({
    id: "order-shipping",
    title: "Costo de envío",
    quantity: 1,
    unit_price: order.shipping,
    currency_id: "ARS",
  });
}

// Recargo Mercado Pago
if (order.paymentSurcharge > 0) {
  mpItems.push({
    id: "mp-surcharge",
    title: "Recargo Mercado Pago 5%",
    quantity: 1,
    unit_price: order.paymentSurcharge,
    currency_id: "ARS",
  });
}
    
    console.log("APP_URL raw:", process.env.APP_URL);
console.log("baseUrl final:", baseUrl);
console.log("success URL:", `${baseUrl}/pago-procesando`);
    const preference = await new Preference(client).create({
      
      body: {
        items: mpItems,
        payer: {
          email: order.customerEmail ?? undefined,
        },
        back_urls: {
          success: `${baseUrl}/pago-procesando`,
          failure: `${baseUrl}/pago-procesando`,
          pending: `${baseUrl}/pago-procesando`,
        },
        //auto_return: "approved",
        statement_descriptor: "GRABADOS-CONQUER",
        external_reference: order.id,
      },
    });

    return NextResponse.json({
  id: preference.id,
  init_point: preference.init_point,
});
  } catch (error: any) {
  console.error("Error creando preferencia:", error);
  return NextResponse.json(
    {
      error: "Error al crear preferencia",
      details: error?.message ?? String(error),
      cause: error?.cause ?? null,
    },
    { status: 500 }
  );
}
}
