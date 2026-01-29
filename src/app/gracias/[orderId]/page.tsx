import Link from "next/link";
import TransferProofUploader from "@/components/checkout/TransferProofUploader";

export const runtime = "nodejs";

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

  // ⚠️ Ideal: poné esto en .env y leé acá
  const BANK = {
    holder: "GRABADOS CONQUER SRL",
    cuit: "30-XXXXXXXX-X",
    bank: "Banco XX",
    cbu: "0000000000000000000000",
    alias: "CONQUER.ALIAS",
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="rounded-3xl border border-conquer-pink bg-white p-6">
        <h1 className="text-2xl font-semibold text-conquer-navy">¡Pedido creado! ✅</h1>

        <p className="mt-3 text-neutral-700">
          Tu número de pedido es: <b>{orderId}</b>
        </p>

        {isTransfer && (
          <div className="mt-6 grid gap-4">
            <div className="rounded-3xl border border-conquer-pink bg-conquer-pink/10 p-5">
              <div className="font-semibold text-conquer-navy">Pago por transferencia</div>
              <div className="mt-3 text-sm text-neutral-700 grid gap-1">
                <div>
                  Titular: <b>{BANK.holder}</b>
                </div>
                <div>
                  CUIT: <b>{BANK.cuit}</b>
                </div>
                <div>
                  Banco: <b>{BANK.bank}</b>
                </div>
                <div>
                  CBU: <b className="font-mono">{BANK.cbu}</b>
                </div>
                <div>
                  Alias: <b className="font-mono">{BANK.alias}</b>
                </div>

                <div className="mt-3 text-xs text-neutral-600">
                  Importante: en el concepto/nota poné el ID del pedido <b>{orderId}</b>.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-conquer-pink p-5">
              <div className="font-semibold text-conquer-navy">Subir comprobante</div>
              <div className="mt-2 text-sm text-neutral-600">
                Podés subir una imagen o PDF del comprobante. (Se adjunta al pedido para el admin)
              </div>

              <div className="mt-4">
                <TransferProofUploader orderId={orderId} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/productos"
            className="h-11 px-5 rounded-2xl border border-conquer-pink text-conquer-navy flex items-center justify-center hover:bg-conquer-pink/10"
          >
            Seguir comprando
          </Link>

          <Link
            href={`/mi-cuenta/pedidos`}
            className="h-11 px-5 rounded-2xl bg-conquer-orange text-white font-semibold flex items-center justify-center hover:opacity-90"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    </main>
  );
}
