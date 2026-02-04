-- AlterTable
ALTER TABLE "SupplierProduct" ADD COLUMN     "name" TEXT,
ALTER COLUMN "externalSku" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SupplierProduct_externalSku_idx" ON "SupplierProduct"("externalSku");
