"use client";

import { useState } from "react";

const OPTIONS = ["PENDIENTE", "PAGADO", "COMPLETADO", "CANCELADO"] as const;

export default function OrderStatusSelect({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(payload?.error || "No se pudo actualizar");
        return;
      }
      // ok
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-10 rounded-xl border px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={saving}
      >
        {OPTIONS.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="h-10 rounded-xl bg-black px-3 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
