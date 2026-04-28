-- CreateIndex
CREATE INDEX "Product_active_createdAt_idx" ON "Product"("active", "createdAt");

-- CreateIndex
CREATE INDEX "Product_active_basePrice_idx" ON "Product"("active", "basePrice");
