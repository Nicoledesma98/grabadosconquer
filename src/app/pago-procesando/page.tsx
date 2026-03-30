"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PagoProcesando() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Estamos verificando tu pago...");

  useEffect(() => {
    const paymentId = searchParams.get("payment_id");
    const merchantOrderId = searchParams.get("merchant_order_id");
    const externalReference = searchParams.get("external_reference");

    async function verifyPayment() {
      try {
        const res = await fetch("/api/mercadopago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId,
            merchantOrderId,
            externalReference,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "No se pudo verificar el pago");
        }

        const status = data?.status;

        if (status === "approved") {
          router.replace(
            `/pago-exitoso?external_reference=${encodeURIComponent(
              data?.externalReference || externalReference || ""
            )}&payment_id=${encodeURIComponent(String(data?.paymentId || paymentId || ""))}`
          );
          return;
        }

        if (status === "pending" || status === "in_process") {
          router.replace(
            `/pago-pendiente?external_reference=${encodeURIComponent(
              data?.externalReference || externalReference || ""
            )}`
          );
          return;
        }

        router.replace(
          `/pago-fallido?external_reference=${encodeURIComponent(
            data?.externalReference || externalReference || ""
          )}`
        );
      } catch (error) {
        console.error("Error verificando pago:", error);
        setMessage(
          "No pudimos verificar el pago automáticamente. Revisá tus pedidos o intentá nuevamente en unos minutos."
        );
      }
    }

    verifyPayment();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-xl shadow p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-conquer-orange mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-3">Procesando pago</h1>
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}