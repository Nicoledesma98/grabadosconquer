/*
  Warnings:

  - You are about to drop the column `marginPercent` on the `PriceRule` table. All the data in the column will be lost.
  - Added the required column `multiplier` to the `PriceRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PriceRule" DROP COLUMN "marginPercent",
ADD COLUMN     "multiplier" DOUBLE PRECISION NOT NULL;
