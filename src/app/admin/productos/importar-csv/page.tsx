"use client";

import { useState } from "react";
import Link from "next/link";

type RowPlan = {
  rowNumber: number;
  errors: string[];
  warnings: string[];
  fields: { slug: string; sku: string };
  productAction: "create" | "update" | "none";
  productBefore: { name: string; active: boolean; baseUsdPrice: number | null; stock: number | null } | null;
  productAfterPreview: { name: string; active: boolean; baseUsdPrice: number | null; basePriceArs: number | null; stock: number | null };
  variantAction: "create" | "update" | "none";
  variantBefore: { colorName: string; stock: number; priceOverride: number | null } | null;
  variantAfterPreview: { colorName: string | null; stock: number | null; priceOverride: number | null } | null;
};

type PreviewResponse = {
  ok: boolean;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: RowPlan[];
};

function formatARS(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function actionLabel(a: "create" | "update" | "none") {
  if (a === "create") return "Crear";
  if (a === "update") return "Actualizar";
  return "-";
}

export default function ImportarCsvProductosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any>(null);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Seleccioná un archivo CSV");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCommitResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/products/import-csv/preview", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Error al procesar preview");
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

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

      const res = await fetch("/api/admin/products/import-csv/commit", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Error al aplicar importación");
      setCommitResult(data);
    } catch (err: any) {
      setError(err?.message || "Error inesperado");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-conquer-navy">Carga masiva de productos (CSV)</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Subí un CSV para previsualizar altas/modificaciones de productos y variantes antes de aplicarlas.
          </p>
        </div>
        <Link href="/admin/productos" className="text-sm underline">
          Volver a productos
        </Link>
      </div>

      <div className="rounded-3xl border border-conquer-pink/30 bg-white p-6 shadow-sm">
        <form onSubmit={handlePreview} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-conquer-navy">Archivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-conquer-pink/30 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-conquer-navy">Columnas del CSV:</p>
              <a
                href="/templates/plantilla-productos.csv"
                download
                className="rounded-xl border border-conquer-orange px-3 py-1.5 text-xs font-semibold text-conquer-orange hover:bg-conquer-orange/10"
              >
                Descargar plantilla CSV
              </a>
            </div>
            <code className="mt-2 block whitespace-pre-wrap text-xs">
              slug,name,description,active,baseUsdPrice,stock,categorias,sku,variantColorName,variantColorHex,variantStock,variantPriceOverride
            </code>
            <ul className="mt-2 list-disc pl-5 text-xs text-neutral-500 space-y-1">
              <li><b>slug</b>: clave del producto (obligatoria). Si no existe, se crea.</li>
              <li><b>name / description / active / baseUsdPrice / stock</b>: dejar vacío para no modificar (en un alta, name y baseUsdPrice son obligatorios).</li>
              <li><b>baseUsdPrice</b> es en dólares — el precio en pesos se calcula solo con el tipo de cambio y las reglas de precio vigentes.</li>
              <li><b>stock</b> sólo aplica a productos sin variantes.</li>
              <li><b>categorias</b>: slugs separados por &quot;;&quot;. Si se completa, reemplaza las categorías actuales.</li>
              <li><b>sku</b>: si se completa, la fila también crea o actualiza una variante (color) de ese producto. variantColorName es obligatorio al crear una variante nueva.</li>
              <li>Podés repetir el mismo slug en varias filas para cargar varios colores de un mismo producto.</li>
            </ul>
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
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Archivo</div>
              <div className="mt-1 text-sm font-semibold text-conquer-navy">{result.fileName}</div>
            </div>
            <div className="rounded-2xl border border-conquer-pink/30 bg-white p-4 shadow-sm">
              <div className="text-xs text-neutral-500">Total filas</div>
              <div className="mt-1 text-sm font-semibold text-conquer-navy">{result.totalRows}</div>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="text-xs text-green-700">Válidas</div>
              <div className="mt-1 text-sm font-semibold text-green-800">{result.validRows}</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <div className="text-xs text-red-700">Con error</div>
              <div className="mt-1 text-sm font-semibold text-red-800">{result.invalidRows}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-conquer-pink/30 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-conquer-pink/10">
                  <tr className="text-left text-conquer-navy">
                    <th className="px-4 py-3">Fila</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Variante (SKU)</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Avisos / Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-conquer-pink/20 align-top">
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-medium text-conquer-navy">{row.fields.slug || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold">{actionLabel(row.productAction)}</div>
                          <div>{row.productAfterPreview.name || "-"}</div>
                          <div className="text-xs text-neutral-500">
                            {formatARS(row.productAfterPreview.basePriceArs)}
                            {row.productAfterPreview.stock != null ? ` · stock: ${row.productAfterPreview.stock}` : ""}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.fields.sku ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold">{actionLabel(row.variantAction)}</div>
                            <div className="font-mono text-xs">{row.fields.sku}</div>
                            <div className="text-xs text-neutral-500">
                              {row.variantAfterPreview?.colorName ?? "-"} · stock: {row.variantAfterPreview?.stock ?? "-"}
                              {row.variantAfterPreview?.priceOverride != null
                                ? ` · ${formatARS(row.variantAfterPreview.priceOverride / 100)}`
                                : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            row.errors.length === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.errors.length === 0 ? "Válida" : "Con error"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.errors.length > 0 && (
                          <ul className="space-y-1 text-xs text-red-700">
                            {row.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                        {row.warnings.length > 0 && (
                          <ul className="mt-1 space-y-1 text-xs text-amber-700">
                            {row.warnings.map((w, i) => (
                              <li key={i}>⚠ {w}</li>
                            ))}
                          </ul>
                        )}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
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
          <h2 className="text-lg font-semibold text-conquer-navy">Resultado de importación</h2>
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
              <div className="font-medium text-green-700">{commitResult.rowsSuccess}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Errores</div>
              <div className="font-medium text-red-700">{commitResult.rowsError}</div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
