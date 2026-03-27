import { prisma } from "@/lib/prisma";

export async function getOrCreateSyncState(key: string, supplierCode: string, syncType: string) {
  return prisma.supplierSyncState.upsert({
    where: { key },
    update: {},
    create: {
      key,
      supplierCode,
      syncType,
      currentIndex: 0,
      status: "idle",
    },
  });
}

export async function markSyncStateRunning(
  key: string,
  totalRows?: number,
  currentIndex?: number
) {
  return prisma.supplierSyncState.update({
    where: { key },
    data: {
      status: "running",
      totalRows,
      currentIndex: currentIndex ?? undefined,
      lastStartedAt: new Date(),
      lastError: null,
    },
  });
}

export async function markSyncStateProgress(
  key: string,
  currentIndex: number,
  totalRows?: number
) {
  return prisma.supplierSyncState.update({
    where: { key },
    data: {
      currentIndex,
      totalRows,
      status: "running",
    },
  });
}

export async function markSyncStateCompleted(key: string, totalRows: number) {
  return prisma.supplierSyncState.update({
    where: { key },
    data: {
      status: "completed",
      currentIndex: totalRows,
      totalRows,
      lastFinishedAt: new Date(),
      lastError: null,
    },
  });
}

export async function markSyncStateError(key: string, error: string) {
  return prisma.supplierSyncState.update({
    where: { key },
    data: {
      status: "error",
      lastError: error,
      lastFinishedAt: new Date(),
    },
  });
}

export async function resetSyncState(key: string) {
  return prisma.supplierSyncState.update({
    where: { key },
    data: {
      currentIndex: 0,
      totalRows: null,
      status: "idle",
      lastError: null,
    },
  });
}