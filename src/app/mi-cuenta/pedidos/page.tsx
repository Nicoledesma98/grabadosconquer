"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

type OrderDTO = {
  id: string;
  createdAt: string;
  subtotal: number;
  total: number;
  items: { id: string; productName: string; qty: number; unitPrice: number; lineTotal: number }[];
};

export default function MisPedidosPage() {
  const router = useRouter();
  const { data, status } = useSession();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/mi-cuenta/pedidos");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      setLoading(true);
      const res = await fetch("/api/me/orders", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login?callbackUrl=/mi-cuenta/pedidos");
        return;
      }
      const data = (await res.json()) as OrderDTO[];
      setOrders(data);
      setLoading(false);
    })();
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border bg-white p-6 text-neutral-600">Cargando...</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-conquer-navy">Mi cuenta · Mis pedidos</h1>
        <Link
          href="/mi-cuenta"
          className="h-10 px-4 rounded-2xl border hover:bg-neutral-50 flex items-center text-sm"
        >
          Volver
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-3xl border bg-white p-6 text-neutral-600">
          Todavía no tenés pedidos con este email: <b>{data?.user?.email}</b>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-3xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-neutral-600">Pedido</div>
                  <div className="font-semibold">{o.id}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {new Date(o.createdAt).toLocaleString("es-AR")}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-neutral-600">Total</div>
                  <div className="text-lg font-semibold text-conquer-navy">{formatARS(o.total)}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium text-conquer-navy truncate">{it.productName}</div>
                      <div className="text-neutral-600">
                        {it.qty} × {formatARS(it.unitPrice)}
                      </div>
                    </div>
                    <div className="font-medium">{formatARS(it.lineTotal)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
