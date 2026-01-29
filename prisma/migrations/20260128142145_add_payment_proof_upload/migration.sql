/*
  Warnings:

  - You are about to drop the column `subtotal` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "subtotal",
ADD COLUMN     "subtotalNet" INTEGER NOT NULL DEFAULT 0;
