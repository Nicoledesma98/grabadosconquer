/*
  Warnings:

  - A unique constraint covering the columns `[productId,variantId,sort]` on the table `ProductImage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_variantId_sort_key" ON "ProductImage"("productId", "variantId", "sort");
