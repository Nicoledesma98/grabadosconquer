import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatARS(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(value);
}

export default async function AdminPedidosPage() {
    const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            items: { orderBy: { id: "asc" } },
            uploads: { orderBy: { createdAt: "asc" } }, // ✅ agregado
        },
    });


    return (
        <main className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Pedidos</h1>
                <Link href="/productos" className="text-sm underline">
                    Ir a productos
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
                    No hay pedidos todavía.
                </div>
            ) : (
                <div className="mt-6 grid gap-4">
                    {orders.map((o) => (
                        <div key={o.id} className="rounded-2xl border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="font-medium">Pedido: {o.id}</div>
                                    <div className="text-sm text-neutral-600">
                                        {o.createdAt.toLocaleString("es-AR")}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm text-neutral-600">Total</div>
                                    <div className="text-xl font-semibold">{formatARS(o.total)}</div>
                                </div>
                            </div>

                            <div className="mt-3 text-sm text-neutral-700">
                                <b>Cliente:</b> {o.customerName || "-"} — {o.customerEmail || "-"}{" "}
                                {o.customerPhone ? `— ${o.customerPhone}` : ""}
                            </div>

                            <div className="mt-4 border-t pt-4">
                                <div className="text-sm font-medium mb-2">Items</div>
                                <div className="grid gap-2">
                                    {o.items.map((it) => (
                                        <div key={it.id} className="flex items-center justify-between text-sm">
                                            <div>
                                                {it.qty}× <b>{it.productName}</b>{" "}
                                                <span className="text-neutral-600">({it.productSlug})</span>
                                            </div>
                                            <div className="font-medium">{formatARS(it.lineTotal)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    {o.uploads.length > 0 && (
                                        <div className="mt-4 rounded-xl  p-3 text-sm">
                                            <div className="font-medium mb-2">Personalización</div>

                                            {o.uploads.map((u) => (
                                                <div key={u.id} className="text-neutral-800">
                                                    <b>{u.type}</b>:{" "}
                                                    {u.text ? (
                                                        <span>{u.text}</span>
                                                    ) : u.url ? (
                                                        <a
                                                            href={u.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="underline"
                                                        >
                                                            {u.originalName || "Abrir archivo"}
                                                        </a>
                                                    ) : (
                                                        "-"
                                                    )}

                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
