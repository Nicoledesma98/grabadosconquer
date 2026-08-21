"use client";

import { useEffect, useState } from "react";

type Batch = {
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
};

export default function HistorialImportacionesCsvPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBatches() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/stock/import-csv/batches");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Error cargando historial");
        }

        setBatches(data.batches || []);
      } catch (err: any) {
        setError(err?.message || "Error inesperado");
      } finally {
        setLoading(false);
      }
    }

    loadBatches();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-conquer-navy">
          Historial de importaciones CSV
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Últimos lotes importados de movimientos de stock.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
          Cargando historial...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-conquer-pink/10">
                <tr className="text-left text-conquer-navy">
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Éxitos</th>
                  <th className="px-4 py-3">Errores</th>
                  <th className="px-4 py-3">Subido por</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-t border-conquer-pink/20"
                  >
                    <td className="px-4 py-3 font-medium text-conquer-navy">
                      {batch.fileName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          batch.status === "PROCESSED"
                            ? "bg-green-100 text-green-800"
                            : batch.status === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{batch.rowsTotal}</td>
                    <td className="px-4 py-3 text-green-700">{batch.rowsSuccess}</td>
                    <td className="px-4 py-3 text-red-700">{batch.rowsError}</td>
                    <td className="px-4 py-3">
                      {batch.uploadedBy?.name || batch.uploadedBy?.email || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(batch.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/admin/stock/importar-csv/historial/${batch.id}`}
                        className="text-sm font-medium text-conquer-orange hover:underline"
                      >
                        Ver detalle
                      </a>
                    </td>
                  </tr>
                ))}

                {batches.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-neutral-500"
                    >
                      No hay importaciones registradas todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}