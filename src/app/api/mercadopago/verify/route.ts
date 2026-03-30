import { MercadoPagoConfig, MerchantOrder, Payment } from "mercadopago";
import { NextResponse } from "next/server";
import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { paymentId, merchantOrderId, externalReference } = await req.json();

    if (paymentId) {
      const payment = await new Payment(client).get({ id: paymentId });

      if (payment.status === "approved" && payment.external_reference) {
        await finalizePaidOrder(String(payment.external_reference));
      }

      return NextResponse.json({
        ok: true,
        status: payment.status,
        paymentId: payment.id,
        externalReference:
          payment.external_reference || externalReference || null,
      });
    }

    if (merchantOrderId) {
      const order = await new MerchantOrder(client).get({
        merchantOrderId,
      });

      const approved = order.payments?.find((p: any) => p.status === "approved");

      if (approved) {
        const ref =
          externalReference || null;

        if (ref) {
          await finalizePaidOrder(String(ref));
        }

        return NextResponse.json({
          ok: true,
          status: "approved",
          paymentId: approved.id,
          externalReference: ref,
        });
      }

      const pending = order.payments?.find(
        (p: any) => p.status === "pending" || p.status === "in_process"
      );

      if (pending) {
        return NextResponse.json({
          ok: true,
          status: pending.status,
          paymentId: pending.id,
          externalReference,
        });
      }

      return NextResponse.json({
        ok: true,
        status: "rejected",
        externalReference,
      });
    }

    return NextResponse.json(
      { error: "Faltan datos para verificar el pago" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error verificando pago Mercado Pago:", error);
    return NextResponse.json(
      { error: "Error al verificar el pago" },
      { status: 500 }
    );
  }
}