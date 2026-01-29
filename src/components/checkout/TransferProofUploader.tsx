"use client";

import { useState } from "react";

export default function TransferProofUploader({ orderId }: { orderId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return alert("Elegí un archivo primero");

    setLoading(true);
    setOk(null);

    try {
      // 1) subir archivo (ya lo tenés)
      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upPayload = await up.json().catch(() => ({}));

      if (!up.ok) {
        console.error("UPLOAD_ERR", upPayload);
        alert(upPayload?.error || "Error subiendo archivo");
        return;
      }

      // 2) guardar en DB como comprobante
      const save = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: upPayload.url,
          originalName: upPayload.originalName,
          mimeType: upPayload.mimeType,
        }),
      });

      const savePayload = await save.json().catch(() => ({}));

      if (!save.ok) {
        console.error("SAVE_ERR", savePayload);
        alert(savePayload?.error || "No se pudo guardar el comprobante");
        return;
      }

      setOk("Comprobante subido ✅");
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="rounded-2xl border border-conquer-pink p-2"
      />

      <button
        type="button"
        onClick={onUpload}
        disabled={loading || !file}
        className="h-11 rounded-2xl bg-conquer-orange text-white font-semibold disabled:opacity-50 hover:opacity-90"
      >
        {loading ? "Subiendo..." : "Subir comprobante"}
      </button>

      {ok && <div className="text-sm text-green-700">{ok}</div>}
    </div>
  );
}
