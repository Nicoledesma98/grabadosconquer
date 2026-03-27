-- CreateTable
CREATE TABLE "SupplierSyncState" (
    "key" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "totalRows" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "lastError" TEXT,
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierSyncState_pkey" PRIMARY KEY ("key")
);
