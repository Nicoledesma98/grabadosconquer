import Link from "next/link";
import TransferProofUploader from "@/components/checkout/TransferProofUploader";
import MetaPixelPurchase from "@/components/MetaPixelPurchase";
import { prisma } from "@/lib/prisma";
import { formatOrderCode } from "@/lib/utils";
import {
  CheckCircle,
  Package,
  CreditCard,
  Banknote,
  ArrowRight,
  CalendarClock,
  Mail,
  MessageCircle,
} from "lucide-react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GraciasPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orderId } = await params;
  const sp = searchParams ? await searchParams : {};
  const pay = typeof sp.pay === "string" ? sp.pay : "";
  const isTransfer = pay === "transfer";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, total: true },
  });
  const orderCode = order ? formatOrderCode(order.orderNumber) : orderId;

  const whatsappLink = `https://wa.me/541170660569?text=Hola!%20Tengo%20una%20consulta%20sobre%20mi%20pedido%20${orderCode}`;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-conquer-pink/5 py-12">
      {order && <MetaPixelPurchase orderId={orderId} value={order.total} currency="ARS" />}
      <div className="mx-auto max-w-4xl px-4">
        {/* Tarjeta principal */}
        <div className="overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white shadow-xl">
          {/* Encabezado decorativo */}
          <div className="relative h-24 bg-gradient-to-r from-conquer-orange/20 to-conquer-turq/20">
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-conquer-orange p-4 shadow-lg">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="px-6 pt-10 pb-8 text-center">
            <h1 className="text-2xl font-bold text-conquer-navy md:text-3xl">
              ¡Gracias por elegir Grabados Conquer!
            </h1>
            <p className="mt-2 text-lg font-semibold text-conquer-orange">
              Tu pedido {orderCode} fue creado con éxito.
            </p>

            {/* Mensaje según método de pago */}
            <div className="mt-4 rounded-2xl bg-conquer-pink/10 p-4 text-left">
              <div className="flex items-start gap-3">
                {isTransfer ? (
                  <Banknote className="h-6 w-6 text-conquer-orange mt-0.5" />
                ) : (
                  <CreditCard className="h-6 w-6 text-conquer-orange mt-0.5" />
                )}
                <div className="text-sm text-neutral-700">
                  {isTransfer ? (
                    <>
                      <p className="font-medium text-conquer-navy">Pago por transferencia</p>
                      <p className="mt-1">
                        Una vez realizado el pago, solicitamos por favor que adjuntes el comprobante a tu orden de compra. Si realizaste el pago mediante Mercado Pago, no te preocupes, ya lo recibimos!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-conquer-navy">Pago confirmado</p>
                      <p className="mt-1">
                        Tu pago ha sido registrado. En breve recibirás un email con los detalles.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Información de contacto y tiempos */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-conquer-pink/30 bg-white p-4">
                <CalendarClock className="h-6 w-6 text-conquer-orange" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-conquer-navy">Tiempo de respuesta</h3>
                  <p className="text-xs text-neutral-600">
                    Dentro de las próximas 48 horas hábiles nos estaremos comunicando con vos para coordinar el diseño y darle curso al pedido.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-conquer-pink/30 bg-white p-4">
                <Mail className="h-6 w-6 text-conquer-orange" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-conquer-navy">¿Consultas?</h3>
                  <p className="text-xs text-neutral-600">
                    Podés escribirnos a{" "}
                    <a href="mailto:ventas@grabadosconquer.com" className="text-conquer-orange hover:underline">
                      ventas@grabadosconquer.com
                    </a>{" "}
                    o por WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Datos de transferencia (solo si es transferencia) */}
          {isTransfer && (
            <div className="border-t border-conquer-pink/30 bg-conquer-pink/5 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-conquer-navy">
                <Banknote className="h-5 w-5" />
                Datos para transferencia
              </h2>
              <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                <div>
                  <span className="font-medium">Titular:</span> {process.env.BANK_HOLDER}
                </div>
                <div>
                  <span className="font-medium">CUIT:</span> {process.env.BANK_CUIT}
                </div>
                <div>
                  <span className="font-medium">Banco:</span> {process.env.BANK_NAME}
                </div>
                <div>
                  <span className="font-medium">CBU:</span>{" "}
                  <span className="font-mono">{process.env.BANK_CBU}</span>
                </div>
                <div>
                  <span className="font-medium">Alias:</span>{" "}
                  <span className="font-mono">{process.env.BANK_ALIAS}</span>
                </div>
              </div>

              {/* Subir comprobante */}
              <div className="mt-6 rounded-2xl border border-conquer-pink/30 bg-white p-5">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-conquer-navy">
                  <Package className="h-4 w-4" />
                  Adjuntar comprobante
                </h3>
                <p className="mb-3 text-xs text-neutral-600">
                  Subí una captura o imagen del comprobante de pago para confirmarlo más rápido.
                </p>
                <TransferProofUploader orderId={orderId} />
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-wrap justify-center gap-3 border-t border-conquer-pink/30 bg-white p-6">
            <Link
              href="/productos"
              className="flex h-11 items-center gap-2 rounded-2xl border border-conquer-pink/30 px-5 text-sm font-medium text-conquer-navy transition-colors hover:border-conquer-orange hover:bg-conquer-pink/5"
            >
              Seguir comprando
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/mi-cuenta/pedidos"
              className="flex h-11 items-center gap-2 rounded-2xl bg-conquer-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-conquer-orange/90"
            >
              Ver mis pedidos
            </Link>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center gap-2 rounded-2xl border border-conquer-pink/30 px-5 text-sm font-medium text-conquer-navy transition-colors hover:border-conquer-orange hover:bg-conquer-pink/5"
            >
              <MessageCircle className="h-4 w-4" />
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}