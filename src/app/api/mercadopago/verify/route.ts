import { MercadoPagoConfig, MerchantOrder, Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { finalizePaidOrder } from "@/lib/orders/finalize-paid-order";
import crypto from "crypto";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // si no hay secret configurado, dejamos pasar

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature) return false;

  // MercadoPago firma con: "ts={timestamp},v1={hash}"
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) return false;

  // El mensaje a firmar es: "{ts}.{x-request-id}.{body}"
  const message = `${ts}.${xRequestId ?? ""}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!verifySignature(req, rawBody)) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { paymentId, merchantOrderId, externalReference } = body;

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
      const order = await new MerchantOrder(client).get({ merchantOrderId });

      const approved = order.payments?.find((p: any) => p.status === "approved");

      if (approved) {
        const ref = externalReference || null;
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
