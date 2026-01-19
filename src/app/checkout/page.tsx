"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/store/cart";
import { useRouter } from "next/navigation";

function formatARS(value: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(value);
}

export default function CheckoutPage() {
    const router = useRouter();
    const items = useCart((s) => s.items);
    const subtotal = useCart((s) => s.subtotal());
    const clear = useCart((s) => s.clear);
    const [customText, setCustomText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);


    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [loading, setLoading] = useState(false);
    const disabled = useMemo(
        () => loading || items.length === 0 || !name.trim() || !email.trim(),
        [loading, items.length, name, email]
    );

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            // 1) Si hay archivo, lo subimos primero a /api/upload
            let uploaded: { url: string; originalName: string; mimeType: string } | null = null;

            if (file) {
                const fd = new FormData();
                fd.append("file", file);

                const up = await fetch("/api/upload", {
                    method: "POST",
                    body: fd,
                });

                if (!up.ok) throw new Error("Upload failed");

                const data = (await up.json()) as { url: string; originalName: string; mimeType: string };
                uploaded = data;

                // opcional: guardar para mostrar en UI
                setFileUrl(data.url);
                setFileName(data.originalName);

            }

            // 2) Crear pedido mandando items + customText + upload
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: name.trim(),
                    customerEmail: email.trim(),
                    customerPhone: phone.trim() || null,
                    customText: customText.trim() || null,
                    upload: uploaded
                        ? {
                            url: uploaded.url,
                            originalName: uploaded.originalName,
                            mimeType: uploaded.mimeType,
                        }
                        : null,
                    items: items.map((i) => ({
                        productId: i.productId,
                        qty: i.qty,
                        unitPrice: i.unitPrice,
                        productName: i.name,
                        productSlug: i.slug,
                    })),
                }),
            });

            if (!res.ok) throw new Error("Checkout failed");

            const data = (await res.json()) as { orderId: string };
            clear();
            router.push(`/gracias/${data.orderId}`);
        } catch (err) {
            alert("No se pudo crear el pedido. Revisá la consola/servidor.");
        } finally {
            setLoading(false);
        }
    }


    return (
        <main className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-semibold">Checkout</h1>

            {items.length === 0 ? (
                <div className="mt-6 rounded-2xl border p-6 text-neutral-600">
                    Tu carrito está vacío.
                </div>
            ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <form onSubmit={onSubmit} className="rounded-2xl border p-5">
                        <div className="font-medium">Datos del cliente</div>

                        <div className="mt-4 grid gap-3">
                            <input
                                className="h-11 rounded-2xl border px-4"
                                placeholder="Nombre y apellido *"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <input
                                className="h-11 rounded-2xl border px-4"
                                placeholder="Email *"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                className="h-11 rounded-2xl border px-4"
                                placeholder="Teléfono (opcional)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    setFile(f);
                                    setFileUrl(null);
                                    setFileName(null);
                                }}
                            />
                            {fileName && fileUrl && (
                                <div className="text-xs text-green-700">
                                    Archivo listo: <b>{fileName}</b>
                                </div>
                            )}

                            <textarea
                                className="min-h-24 rounded-2xl border px-4 py-3"
                                placeholder="Texto a grabar / indicaciones (opcional)"
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                            />

                        </div>

                        <button
                            disabled={disabled}
                            className="mt-5 h-11 w-full rounded-2xl bg-black text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {loading ? "Creando pedido..." : "Confirmar pedido"}
                        </button>
                    </form>

                    <div className="rounded-2xl border p-5">
                        <div className="font-medium">Resumen</div>

                        <div className="mt-4 grid gap-3">
                            {items.map((i) => (
                                <div key={i.productId} className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium">{i.name}</div>
                                        <div className="text-sm text-neutral-600">
                                            {i.qty} × {formatARS(i.unitPrice)}
                                        </div>
                                    </div>
                                    <div className="font-medium">{formatARS(i.qty * i.unitPrice)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t pt-4">
                            <span className="font-medium">Total</span>
                            <span className="text-xl font-semibold">{formatARS(subtotal)}</span>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
