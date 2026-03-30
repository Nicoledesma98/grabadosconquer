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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Falta NEXT_PUBLIC_BASE_URL" },
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

    if (order.paymentMethod !== "MERCADO_PAGO") {
      return NextResponse.json(
        { error: "El pedido no es de Mercado Pago" },
        { status: 400 }
      );
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

    const preference = await new Preference(client).create({
      body: {
        items: order.items.map((item) => ({
  id: item.productId,
  title: item.productName,
  quantity: item.qty,
  unit_price: item.unitPrice,
  currency_id: "ARS",
})),
  
        payer: {
          email: order.customerEmail ?? undefined,
        },
        back_urls: {
          success: `${baseUrl}/pago-procesando`,
          failure: `${baseUrl}/pago-procesando`,
          pending: `${baseUrl}/pago-procesando`,
        },
        auto_return: "approved",
        statement_descriptor: "GRABADOS CONQUER",
        external_reference: order.id,
      },
    });

    return NextResponse.json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error("Error creando preferencia:", error);
    return NextResponse.json(
      { error: "Error al crear preferencia" },
      { status: 500 }
    );
  }
}