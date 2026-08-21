import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireProductsAccess } from "@/lib/require-admin-sell";
import { createImportContext, planRow, type ProductCsvRow } from "@/lib/import/products-csv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireProductsAccess(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo CSV" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<ProductCsvRow>(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return NextResponse.json({ error: "Error parseando CSV", details: parsed.errors }, { status: 400 });
    }

    const rows = parsed.data;
    const ctx = await createImportContext();

    const plans = [];
    for (let i = 0; i < rows.length; i++) {
      const plan = await planRow(ctx, rows[i], i + 2);
      plans.push(plan);
    }

    const validRows = plans.filter((p) => p.errors.length === 0).length;

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      totalRows: plans.length,
      validRows,
      invalidRows: plans.length - validRows,
      rows: plans,
    });
  } catch (error: any) {
    console.error("Error preview CSV productos:", error);
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
