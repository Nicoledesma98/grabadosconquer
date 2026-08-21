"use client";

import { useState } from "react";

type PreviewRow = {
  rowNumber: number;
  originalRow: Record<string, any>;
  parsed: {
    fecha: string;
    canal: string;
    cliente: string;
    sku: string;
    cantidad: number | null;
    stockSource: string;
    applyMode: string;
    observaciones: string;
  };
  matched: {
    type: "variant" | "product";
    productId: string;
    productName: string;
    productSlug: string;
    variantId: string | null;
    variantSku: string | null;
    colorName: string | null;
    ownStock: number | null;
    supplierStock: number | null;
  } | null;
  valid: boolean;
  errors: string[];
};

type PreviewResponse = {
  ok: boolean;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: PreviewRow[];
};

export default function ImportarCsvStockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

    async function handleCommit() {
  if (!file) {
    setError("Seleccioná un archivo CSV");
    return;
  }

  setCommitting(true);
  setError("");
  setCommitResult(null);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/stock/import-csv/commit", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Error al aplicar importación");
    }

    setCommitResult(data);
  } catch (err: any) {
    setError(err?.message || "Error inesperado");
  } finally {
    setCommitting(false);
  }
}

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Seleccioná un archivo CSV");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/stock/import-csv/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al procesar preview");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-conquer-navy">
          Importar CSV de movimientos de stock
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Subí un CSV para previsualizar movimientos antes de aplicarlos.
        </p>
      </div>

      <div className="rounded-3xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
        <form onSubmit={handlePreview} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-conquer-navy">
              Archivo CSV
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
              }}
              className="block w-full rounded-xl border border-conquer-pink/30 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold text-conquer-navy">Formato esperado:</p>
            <code className="mt-2 block whitespace-pre-wrap text-xs">
              fecha,canal,cliente,sku,cantidad,stockSource,applyMode,observaciones
            </code>
            <p className="mt-2 text-xs text-neutral-500">
              Canales válidos: MERCADO_LIBRE, WHATSAPP
            </p>
            <p className="text-xs text-neutral-500">
              stockSource: OWN o SUPPLIER
            </p>
            <p className="text-xs text-neutral-500">
              applyMode: APPLY o REGISTER_ONLY
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-conquer-orange px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Previsualizar CSV"}
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Archivo</div>
              <div className="mt-1 text-sm font-semibold text-conquer-navy">
                {result.fileName}
              </div>
            </div>

            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Total filas</div>
              <div className="mt-1 text-sm font-semibold text-conquer-navy">
                {result.totalRows}
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="text-xs text-green-700">Válidas</div>
              <div className="mt-1 text-sm font-semibold text-green-800">
                {result.validRows}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="text-xs text-red-700">Con error</div>
              <div className="mt-1 text-sm font-semibold text-red-800">
                {result.invalidRows}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-conquer-pink/10">
                  <tr className="text-left text-conquer-navy">
                    <th className="px-4 py-3">Fila</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Match</th>
                    <th className="px-4 py-3">Stock actual</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="border-t border-conquer-pink/20 align-top"
                    >
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-medium text-conquer-navy">
                        {row.parsed.sku || "-"}
                      </td>
                      <td className="px-4 py-3">{row.parsed.canal || "-"}</td>
                      <td className="px-4 py-3">{row.parsed.cantidad ?? "-"}</td>
                      <td className="px-4 py-3">
                        {row.matched ? (
                          <div className="space-y-1">
                            <div className="font-medium text-conquer-navy">
                              {row.matched.productName}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {row.matched.type === "variant"
                                ? `Variante: ${row.matched.variantSku} ${
                                    row.matched.colorName
                                      ? `(${row.matched.colorName})`
                                      : ""
                                  }`
                                : "Producto simple"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">Sin match</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.matched ? (
                          <div className="space-y-1 text-xs">
                            <div>Propio: {row.matched.ownStock ?? 0}</div>
                            <div>Proveedor: {row.matched.supplierStock ?? 0}</div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            row.valid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.valid ? "Válida" : "Con error"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.errors.length > 0 ? (
                          <ul className="space-y-1 text-xs text-red-700">
                            {row.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-green-700">Sin errores</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {result.validRows > 0 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCommit}
                disabled={committing}
                className="rounded-2xl bg-conquer-turq px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
              >
                {committing ? "Aplicando..." : "Aplicar importación"}
              </button>
            </div>
          )}
        </section>
      )}
            {commitResult && (
        <div className="mt-6 rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-conquer-navy">
            Resultado de importación
          </h2>

          <div className="mt-3 grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-xs text-neutral-500">Lote</div>
              <div className="font-medium">{commitResult.batchId}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Estado</div>
              <div className="font-medium">{commitResult.status}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Éxitos</div>
              <div className="font-medium text-green-700">
                {commitResult.rowsSuccess}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Errores</div>
              <div className="font-medium text-red-700">
                {commitResult.rowsError}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}