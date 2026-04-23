-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "variantId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
