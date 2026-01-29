/*
  Warnings:

  - You are about to drop the column `subtotalNet` on the `Order` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UploadType" ADD VALUE 'PAYMENT_PROOF';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "subtotalNet",
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0;
