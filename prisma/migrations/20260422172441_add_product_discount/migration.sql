-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "discountActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;
