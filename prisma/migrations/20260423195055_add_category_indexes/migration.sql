-- CreateIndex
CREATE INDEX "Category_active_parentId_idx" ON "Category"("active", "parentId");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
