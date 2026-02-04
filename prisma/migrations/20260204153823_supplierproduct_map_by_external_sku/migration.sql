/*
  Warnings:

  - You are about to drop the column `supplierName` on the `SupplierProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[supplierId,externalSku]` on the table `SupplierProduct` will be added. If there are existing duplicate values, this will fail.
  - Made the column `externalSku` on table `SupplierProduct` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "SupplierProduct_externalSku_idx";

-- DropIndex
DROP INDEX "SupplierProduct_supplierId_externalId_key";

-- AlterTable
ALTER TABLE "SupplierProduct" DROP COLUMN "supplierName",
ALTER COLUMN "productId" DROP NOT NULL,
ALTER COLUMN "externalSku" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_externalSku_key" ON "SupplierProduct"("supplierId", "externalSku");
