import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireProductsAccess } from "@/lib/require-admin-sell";
import { createImportContext, planRow, commitRow, type ProductCsvRow } from "@/lib/import/products-csv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const guard = await requireProductsAccess(req);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenEmail = (token as any)?.email;
    const currentUser = tokenEmail
      ? await prisma.user.findUnique({ where: { email: tokenEmail }, select: { id: true } })
      : null;
    const userId = currentUser?.id ?? null;

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

    const batch = await prisma.importBatch.create({
      data: {
        type: "PRODUCT_UPDATE",
        status: "PENDING",
        fileName: file.name,
        uploadedById: userId,
        rowsTotal: rows.length,
      },
    });

    let rowsSuccess = 0;
    let rowsError = 0;
    const results: any[] = [];
    const errorSamples: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const plan = await planRow(ctx, rows[i], rowNumber);

      if (plan.errors.length > 0) {
        rowsError++;
        results.push({ rowNumber, slug: plan.fields.slug, sku: plan.fields.sku || null, ok: false, error: plan.errors.join(" | ") });
        errorSamples.push(`Fila ${rowNumber}: ${plan.errors.join(" | ")}`);
        continue;
      }

      try {
        const { productId, variantId } = await commitRow(ctx, plan);
        rowsSuccess++;
        results.push({ rowNumber, slug: plan.fields.slug, sku: plan.fields.sku || null, ok: true, productId, variantId });
      } catch (err: any) {
        rowsError++;
        const message = err?.message || "Error procesando fila";
        results.push({ rowNumber, slug: plan.fields.slug, sku: plan.fields.sku || null, ok: false, error: message });
        errorSamples.push(`Fila ${rowNumber}: ${message}`);
      }
    }

    const finalStatus = rowsError === 0 ? "PROCESSED" : rowsSuccess > 0 ? "PARTIAL" : "FAILED";

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        rowsSuccess,
        rowsError,
        processedAt: new Date(),
        notes: errorSamples.length > 0 ? errorSamples.slice(0, 20).join("\n") : null,
      },
    });

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      status: finalStatus,
      rowsTotal: rows.length,
      rowsSuccess,
      rowsError,
      results,
    });
  } catch (error: any) {
    console.error("Error commit CSV productos:", error);
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
