import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CsvRow = {
  fecha?: string;
  canal?: string;
  cliente?: string;
  sku?: string;
  cantidad?: string;
  stockSource?: string;
  applyMode?: string;
  observaciones?: string;
};

const VALID_CHANNELS = ["MERCADO_LIBRE", "WHATSAPP"] as const;
const VALID_STOCK_SOURCES = ["OWN", "SUPPLIER"] as const;
const VALID_APPLY_MODES = ["APPLY", "REGISTER_ONLY"] as const;

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeUpper(value: unknown) {
  return normalize(value).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as any)?.role;

    if (!token || !["ADMIN", "STOCK", "VENTAS"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Falta archivo CSV" }, { status: 400 });
    }

    const text = await file.text();

    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: "Error parseando CSV",
          details: parsed.errors,
        },
        { status: 400 }
      );
    }

    const rows = parsed.data;

    const previewResults = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const canal = normalizeUpper(row.canal);
      const cliente = normalize(row.cliente);
      const sku = normalizeUpper(row.sku);
      const cantidadRaw = normalize(row.cantidad);
      const stockSource = normalizeUpper(row.stockSource);
      const applyMode = normalizeUpper(row.applyMode);
      const observaciones = normalize(row.observaciones);
      const fecha = normalize(row.fecha);

      const rowNumber = index + 2; // +2 por header + base 1
      const errors: string[] = [];

      if (!fecha) errors.push("Falta fecha");
      if (!canal || !VALID_CHANNELS.includes(canal as any)) {
        errors.push("Canal inválido");
      }
      if (!sku) errors.push("Falta SKU");

      const cantidad = Number(cantidadRaw);
      if (!cantidadRaw || Number.isNaN(cantidad) || cantidad <= 0) {
        errors.push("Cantidad inválida");
      }

      if (!stockSource || !VALID_STOCK_SOURCES.includes(stockSource as any)) {
        errors.push("stockSource inválido");
      }

      if (!applyMode || !VALID_APPLY_MODES.includes(applyMode as any)) {
        errors.push("applyMode inválido");
      }

      let matchedVariant = null;
      let matchedProduct = null;
      let currentOwnStock: number | null = null;
      let currentSupplierStock: number | null = null;

      if (sku) {
        matchedVariant = await prisma.productVariant.findUnique({
          where: { sku },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                active: true,
              },
            },
            supplierMaps: {
              select: {
                supplierStock: true,
                supplierId: true,
              },
            },
          },
        });

        if (matchedVariant) {
          currentOwnStock = matchedVariant.stock ?? 0;
          currentSupplierStock = matchedVariant.supplierMaps.reduce(
            (sum, item) => sum + (item.supplierStock ?? 0),
            0
          );
        } else {
          matchedProduct = await prisma.product.findFirst({
            where: { slug: sku.toLowerCase() },
            include: {
              supplierMap: {
                select: {
                  supplierStock: true,
                },
              },
            },
          });

          if (matchedProduct) {
            currentOwnStock = matchedProduct.stock ?? 0;
            currentSupplierStock = matchedProduct.supplierMap.reduce(
              (sum, item) => sum + (item.supplierStock ?? 0),
              0
            );
          } else {
            errors.push("No se encontró producto o variante para ese SKU");
          }
        }
      }

      previewResults.push({
        rowNumber,
        originalRow: row,
        parsed: {
          fecha,
          canal,
          cliente,
          sku,
          cantidad: Number.isNaN(cantidad) ? null : cantidad,
          stockSource,
          applyMode,
          observaciones,
        },
        matched: matchedVariant
          ? {
              type: "variant",
              productId: matchedVariant.product.id,
              productName: matchedVariant.product.name,
              productSlug: matchedVariant.product.slug,
              variantId: matchedVariant.id,
              variantSku: matchedVariant.sku,
              colorName: matchedVariant.colorName,
              ownStock: currentOwnStock,
              supplierStock: currentSupplierStock,
            }
          : matchedProduct
          ? {
              type: "product",
              productId: matchedProduct.id,
              productName: matchedProduct.name,
              productSlug: matchedProduct.slug,
              variantId: null,
              variantSku: null,
              colorName: null,
              ownStock: currentOwnStock,
              supplierStock: currentSupplierStock,
            }
          : null,
        valid: errors.length === 0,
        errors,
      });
    }

    const validRows = previewResults.filter((r) => r.valid).length;
    const invalidRows = previewResults.length - validRows;

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      totalRows: previewResults.length,
      validRows,
      invalidRows,
      rows: previewResults,
    });
  } catch (error: any) {
    console.error("Error preview CSV stock:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}