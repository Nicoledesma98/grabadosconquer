/*
  Warnings:

  - A unique constraint covering the columns `[productId,externalVariantId]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "externalVariantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_externalVariantId_key" ON "ProductVariant"("productId", "externalVariantId");
