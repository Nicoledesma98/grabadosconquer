"use client";

import { useState } from "react";

export default function NFSyncButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(page: number) {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/admin/suppliers/nuevaformas/sync?page=${page}`, {
        method: "POST",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) throw new Error(data?.error || `Sync failed (${res.status})`);

      setMsg(
        `OK · page=${data.page} · rows=${data.rows} · products+${data.createdProducts} · variants+${data.createdVariants} · stockUpd=${data.updatedVariants}`
      );
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={loading}
        onClick={() => run(1)}
        className="h-10 rounded-2xl bg-conquer-orange text-white font-semibold px-4 disabled:opacity-50"
      >
        {loading ? "Sincronizando..." : "Sync NuevasFormas (mock) · pág 1"}
      </button>

      {msg && <span className="text-xs text-neutral-700">{msg}</span>}
    </div>
  );
}
