import { NextRequest, NextResponse } from "next/server";
import { fetchStockSurPage } from "@/lib/suppliers/stocksur/client";
import { acquireIntegrationLock, releaseIntegrationLock } from "@/lib/integrations/lock";
import {
  ensureSupplier,
  getExchangeRate,
  getPriceRules,
  syncStockAndPriceRow,
} from "@/lib/suppliers/stocksur/sync";
import {
  getOrCreateSyncState,
  markSyncStateCompleted,
  markSyncStateError,
  markSyncStateProgress,
  markSyncStateRunning,
  resetSyncState,
} from "@/lib/suppliers/stocksur/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCK_KEY = "stocksur-sync-stock-price";
const STATE_KEY = "stocksur-sync-stock-price-state";
const DEFAULT_CHUNK_SIZE = 5;

function isAuthorized(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  const lockAcquired = await acquireIntegrationLock(LOCK_KEY);

  if (!lockAcquired) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Ya hay una sincronización corriendo",
    });
  }

  try {
    const token = process.env.SS_AUTH_TOKEN;
    if (!token) {
      throw new Error("Falta SS_AUTH_TOKEN en variables de entorno");
    }

    const supplier = await ensureSupplier();
    const exchangeRate = await getExchangeRate();
    const priceRules = await getPriceRules();

    const data = await fetchStockSurPage(token, 100, 1);
    const rows = data.products;
    const totalRows = rows.length;

    const state = await getOrCreateSyncState(
      STATE_KEY,
      "SUR",
      "sync_stock_price"
    );

    if (!rows.length) {
      await markSyncStateCompleted(STATE_KEY, 0);
      await releaseIntegrationLock(LOCK_KEY, { success: true });

      return NextResponse.json({
        ok: true,
        total: 0,
        processedThisRun: 0,
        done: true,
      });
    }

    let currentIndex = state.currentIndex || 0;

    if (currentIndex >= totalRows) {
      await resetSyncState(STATE_KEY);
      currentIndex = 0;
    }

    const chunkSize = Number(
      process.env.STOCKSUR_SYNC_CHUNK_SIZE || DEFAULT_CHUNK_SIZE
    );
    const endIndex = Math.min(currentIndex + chunkSize, totalRows);
    const rowsToProcess = rows.slice(currentIndex, endIndex);

    await markSyncStateRunning(STATE_KEY, totalRows, currentIndex);

    let processedThisRun = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rowsToProcess) {
      const result = await syncStockAndPriceRow(row, {
        supplierId: supplier.id,
        exchangeRate,
        priceRules,
      });

      processedThisRun++;

      if (result.status === "updated") updated++;
      if (result.status === "skipped_not_linked") skipped++;
    }

    const newIndex = endIndex;
    const done = newIndex >= totalRows;

    if (done) {
      await markSyncStateCompleted(STATE_KEY, totalRows);
    } else {
      await markSyncStateProgress(STATE_KEY, newIndex, totalRows);
    }

    await releaseIntegrationLock(LOCK_KEY, { success: true });

    return NextResponse.json({
      ok: true,
      total: totalRows,
      fromIndex: currentIndex,
      toIndex: endIndex,
      processedThisRun,
      updated,
      skipped,
      chunkSize,
      done,
      nextIndex: done ? totalRows : newIndex,
    });
  } catch (error: any) {
    console.error("Error en cron StockSur sync:", error);

    await markSyncStateError(STATE_KEY, error?.message || "Error interno");
    await releaseIntegrationLock(LOCK_KEY, {
      success: false,
      error: error?.message || "Error interno",
    });

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error interno",
      },
      { status: 500 }
    );
  }
}