"use client";

import { useEffect, useState } from "react";

type StockRow = {
  id: string;
  sku: string;
  productName: string | null;
  customerName: string | null;
  channel: string | null;
  quantity: number;
  stockSource: string;
  applyMode: string;
  movementId: string | null;
  notes: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type BatchDetail = {
  id: string;
  fileName: string;
  status: string;
  rowsTotal: number;
  rowsSuccess: number;
  rowsError: number;
  createdAt: string;
  processedAt: string | null;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  stockImportRows: StockRow[];
};

export default function DetalleImportacionCsvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [batchId, setBatchId] = useState("");

  useEffect(() => {
    async function init() {
      const resolved = await params;
      setBatchId(resolved.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (!batchId) return;

    async function loadBatch() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/stock/import-csv/batches/${batchId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Error cargando detalle");
        }

        setBatch(data.batch);
      } catch (err: any) {
        setError(err?.message || "Error inesperado");
      } finally {
        setLoading(false);
      }
    }

    loadBatch();
  }, [batchId]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {loading && (
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          Cargando detalle...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {batch && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-conquer-navy">
              Detalle de importación
            </h1>
            <p className="mt-2 text-sm text-neutral-600">{batch.fileName}</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Estado</div>
              <div className="mt-1 font-semibold text-conquer-navy">
                {batch.status}
              </div>
            </div>
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Total</div>
              <div className="mt-1 font-semibold text-conquer-navy">
                {batch.rowsTotal}
              </div>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="text-xs text-green-700">Éxitos</div>
              <div className="mt-1 font-semibold text-green-800">
                {batch.rowsSuccess}
              </div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="text-xs text-red-700">Errores</div>
              <div className="mt-1 font-semibold text-red-800">
                {batch.rowsError}
              </div>
            </div>
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Subido por</div>
              <div className="mt-1 font-semibold text-conquer-navy">
                {batch.uploadedBy?.name || batch.uploadedBy?.email || "-"}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-conquer-pink/10">
                  <tr className="text-left text-conquer-navy">
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Modo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.stockImportRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-conquer-pink/20"
                    >
                      <td className="px-4 py-3 font-medium text-conquer-navy">
                        {row.sku}
                      </td>
                      <td className="px-4 py-3">{row.productName || "-"}</td>
                      <td className="px-4 py-3">{row.customerName || "-"}</td>
                      <td className="px-4 py-3">{row.channel || "-"}</td>
                      <td className="px-4 py-3">{row.quantity}</td>
                      <td className="px-4 py-3">{row.stockSource}</td>
                      <td className="px-4 py-3">{row.applyMode}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            row.errorMessage
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {row.errorMessage ? "Error" : "OK"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-red-700">
                        {row.errorMessage || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}