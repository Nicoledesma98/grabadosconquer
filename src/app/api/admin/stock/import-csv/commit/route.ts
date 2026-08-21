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

const VALID_CHANNELS = ["WEB", "MERCADO_LIBRE", "WHATSAPP"] as const;
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
    const tokenEmail = (token as any)?.email;

const currentUser = tokenEmail
  ? await prisma.user.findUnique({
      where: { email: tokenEmail },
      select: { id: true },
    })
  : null;

const userId = currentUser?.id ?? null;
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

    const batch = await prisma.importBatch.create({
      data: {
        type: "SALES_MOVEMENTS",
        status: "PENDING",
        fileName: file.name,
        uploadedById: userId,
        rowsTotal: rows.length,
      },
    });

    let rowsSuccess = 0;
    let rowsError = 0;
    const results: any[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const fecha = normalize(row.fecha);
      const canal = normalizeUpper(row.canal);
      const cliente = normalize(row.cliente);
      const sku = normalizeUpper(row.sku);
      const cantidadRaw = normalize(row.cantidad);
      const stockSource = normalizeUpper(row.stockSource);
      const applyMode = normalizeUpper(row.applyMode);
      const observaciones = normalize(row.observaciones);

      const rowNumber = index + 2;
      const errors: string[] = [];

      if (!fecha) errors.push("Falta fecha");
      if (!canal || !VALID_CHANNELS.includes(canal as any)) {
        errors.push("Canal inválido");
      }

      const cantidad = Number(cantidadRaw);
      if (!cantidadRaw || Number.isNaN(cantidad) || cantidad <= 0) {
        errors.push("Cantidad inválida");
      }

      if (!sku) errors.push("Falta SKU");

      if (!stockSource || !VALID_STOCK_SOURCES.includes(stockSource as any)) {
        errors.push("stockSource inválido");
      }

      if (!applyMode || !VALID_APPLY_MODES.includes(applyMode as any)) {
        errors.push("applyMode inválido");
      }

      let matchedVariant = null;
      let matchedProduct = null;

      if (sku) {
        matchedVariant = await prisma.productVariant.findUnique({
          where: { sku },
          include: {
            product: true,
            supplierMaps: true,
          },
        });

        if (!matchedVariant) {
          matchedProduct = await prisma.product.findFirst({
            where: { slug: sku.toLowerCase() },
            include: {
              supplierMap: true,
            },
          });
        }

        if (!matchedVariant && !matchedProduct) {
          errors.push("No se encontró producto o variante para ese SKU");
        }
      }

      let createdMovementId: string | null = null;

      if (errors.length === 0) {
        try {
          await prisma.$transaction(async (tx) => {
            if (matchedVariant) {
              if (applyMode === "APPLY") {
                if (stockSource === "OWN") {
                  const previousStock = matchedVariant.stock ?? 0;
                  const newStock = previousStock - cantidad;

                  if (newStock < 0) {
                    throw new Error("Stock propio insuficiente");
                  }

                  await tx.productVariant.update({
                    where: { id: matchedVariant.id },
                    data: { stock: newStock },
                  });

                  const movement = await tx.stockMovement.create({
                    data: {
                      variantId: matchedVariant.id,
                      productId: matchedVariant.productId,
                      source: "OWN",
                      movementType: "OUT",
                      quantity: cantidad,
                      previousStock,
                      newStock,
                      createdById: userId,
                      notes: `[${canal}] ${cliente || "Sin cliente"} - ${observaciones || "Importación CSV"}`,
                    },
                  });

                  createdMovementId = movement.id;
                }

                if (stockSource === "SUPPLIER") {
                  const supplierMap = matchedVariant.supplierMaps[0];

                  if (!supplierMap) {
                    throw new Error("La variante no tiene vínculo con proveedor");
                  }

                  const previousStock = supplierMap.supplierStock ?? 0;
                  const newStock = previousStock - cantidad;

                  if (newStock < 0) {
                    throw new Error("Stock proveedor insuficiente");
                  }

                  await tx.supplierProduct.update({
                    where: { id: supplierMap.id },
                    data: { supplierStock: newStock },
                  });

                  const movement = await tx.stockMovement.create({
                    data: {
                      variantId: matchedVariant.id,
                      productId: matchedVariant.productId,
                      source: "SUPPLIER",
                      movementType: "OUT",
                      quantity: cantidad,
                      previousStock,
                      newStock,
                      createdById: userId,
                      notes: `[${canal}] ${cliente || "Sin cliente"} - ${observaciones || "Importación CSV"}`,
                    },
                  });

                  createdMovementId = movement.id;
                }
              }

              await tx.stockImportRow.create({
                data: {
                  batchId: batch.id,
                  productId: matchedVariant.productId,
                  variantId: matchedVariant.id,
                  sku,
                  productName: matchedVariant.product.name,
                  customerName: cliente || null,
                  channel: canal as any,
                  quantity: cantidad,
                  stockSource: stockSource as any,
                  applyMode: applyMode as any,
                  movementId: createdMovementId,
                  notes: observaciones || null,
                },
              });
            } else if (matchedProduct) {
              if (applyMode === "APPLY") {
                if (stockSource === "OWN") {
                  const previousStock = matchedProduct.stock ?? 0;
                  const newStock = previousStock - cantidad;

                  if (newStock < 0) {
                    throw new Error("Stock propio insuficiente");
                  }

                  await tx.product.update({
                    where: { id: matchedProduct.id },
                    data: { stock: newStock },
                  });

                  const movement = await tx.stockMovement.create({
                    data: {
                      productId: matchedProduct.id,
                      source: "OWN",
                      movementType: "OUT",
                      quantity: cantidad,
                      previousStock,
                      newStock,
                      createdById: userId,
                      notes: `[${canal}] ${cliente || "Sin cliente"} - ${observaciones || "Importación CSV"}`,
                    },
                  });

                  createdMovementId = movement.id;
                }

                if (stockSource === "SUPPLIER") {
                  const supplierMap = matchedProduct.supplierMap[0];

                  if (!supplierMap) {
                    throw new Error("El producto no tiene vínculo con proveedor");
                  }

                  const previousStock = supplierMap.supplierStock ?? 0;
                  const newStock = previousStock - cantidad;

                  if (newStock < 0) {
                    throw new Error("Stock proveedor insuficiente");
                  }

                  await tx.supplierProduct.update({
                    where: { id: supplierMap.id },
                    data: { supplierStock: newStock },
                  });

                  const movement = await tx.stockMovement.create({
                    data: {
                      productId: matchedProduct.id,
                      source: "SUPPLIER",
                      movementType: "OUT",
                      quantity: cantidad,
                      previousStock,
                      newStock,
                      createdById: userId,
                      notes: `[${canal}] ${cliente || "Sin cliente"} - ${observaciones || "Importación CSV"}`,
                    },
                  });

                  createdMovementId = movement.id;
                }
              }

              await tx.stockImportRow.create({
                data: {
                  batchId: batch.id,
                  productId: matchedProduct.id,
                  variantId: null,
                  sku,
                  productName: matchedProduct.name,
                  customerName: cliente || null,
                  channel: canal as any,
                  quantity: cantidad,
                  stockSource: stockSource as any,
                  applyMode: applyMode as any,
                  movementId: createdMovementId,
                  notes: observaciones || null,
                },
              });
            }
          });

          rowsSuccess++;
          results.push({
            rowNumber,
            sku,
            ok: true,
          });
        } catch (err: any) {
          rowsError++;

          await prisma.stockImportRow.create({
            data: {
              batchId: batch.id,
              sku,
              productName: matchedVariant?.product?.name || matchedProduct?.name || null,
              customerName: cliente || null,
              channel: canal as any,
              quantity: Number.isNaN(cantidad) ? 0 : cantidad,
              stockSource: (stockSource || "OWN") as any,
              applyMode: (applyMode || "REGISTER_ONLY") as any,
              notes: observaciones || null,
              errorMessage: err?.message || "Error procesando fila",
            },
          });

          results.push({
            rowNumber,
            sku,
            ok: false,
            error: err?.message || "Error procesando fila",
          });
        }
      } else {
        rowsError++;

        await prisma.stockImportRow.create({
          data: {
            batchId: batch.id,
            sku,
            productName: null,
            customerName: cliente || null,
            channel: VALID_CHANNELS.includes(canal as any) ? (canal as any) : "WEB",
            quantity: Number.isNaN(cantidad) ? 0 : cantidad,
            stockSource: VALID_STOCK_SOURCES.includes(stockSource as any)
              ? (stockSource as any)
              : "OWN",
            applyMode: VALID_APPLY_MODES.includes(applyMode as any)
              ? (applyMode as any)
              : "REGISTER_ONLY",
            notes: observaciones || null,
            errorMessage: errors.join(" | "),
          },
        });

        results.push({
          rowNumber,
          sku,
          ok: false,
          error: errors.join(" | "),
        });
      }
    }

    const finalStatus =
      rowsError === 0 ? "PROCESSED" : rowsSuccess > 0 ? "PARTIAL" : "FAILED";

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        rowsSuccess,
        rowsError,
        processedAt: new Date(),
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
    console.error("Error commit CSV stock:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno" },
      { status: 500 }
    );
  }
}