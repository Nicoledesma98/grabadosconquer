"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export default function NFSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const syncPage = async (pageNum: number) => {
    setError(null);
    const res = await fetch("/api/suppliers/nuevasformas/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pageNum, perPage: 20 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error en la sincronización");
    return data;
  };

  const handleSync = async () => {
    setSyncing(true);
    setResults([]);
    setPage(1);
    setDone(false);
    let currentPage = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const data = await syncPage(currentPage);
        
        // ✅ Solo agregar si results es un array
        if (Array.isArray(data.results)) {
          setResults((prev) => [...prev, ...data.results]);
        }

        setPage(currentPage);

        // ✅ Condición de fin
        if (data.done || data.count === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-2 rounded-2xl bg-conquer-orange px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? `Sincronizando página ${page}...` : "Sincronizar productos"}
      </button>

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-conquer-navy">
            {done ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <RefreshCw className="h-5 w-5 animate-spin text-conquer-orange" />
            )}
            {done
              ? `Sincronización completada (${results.length} productos)`
              : `Sincronizando página ${page}...`}
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto text-xs">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-conquer-pink/10 last:border-0">
                <span className="font-mono">{r.externalSku}</span>
                <span className="text-conquer-navy">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}