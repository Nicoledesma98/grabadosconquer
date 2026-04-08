/*
  Warnings:

  - The values [A,B] on the enum `InvoiceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [MERCADO_PAGO] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [OCA,VIACARGO] on the enum `ShippingMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceType_new" AS ENUM ('CONSUMIDOR_FINAL', 'IVA_EXENTO', 'RESPONSABLE_INSCRIPTO');
ALTER TABLE "public"."Order" ALTER COLUMN "invoiceType" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "invoiceType" TYPE "InvoiceType_new" USING ("invoiceType"::text::"InvoiceType_new");
ALTER TYPE "InvoiceType" RENAME TO "InvoiceType_old";
ALTER TYPE "InvoiceType_new" RENAME TO "InvoiceType";
DROP TYPE "public"."InvoiceType_old";
ALTER TABLE "Order" ALTER COLUMN "invoiceType" SET DEFAULT 'CONSUMIDOR_FINAL';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'TRANSFER', 'COORDINATE');
ALTER TABLE "public"."Order" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ShippingMethod_new" AS ENUM ('PICKUP', 'MOTO', 'COORDINATE_INTERIOR');
ALTER TABLE "public"."Order" ALTER COLUMN "shippingMethod" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "shippingMethod" TYPE "ShippingMethod_new" USING ("shippingMethod"::text::"ShippingMethod_new");
ALTER TYPE "ShippingMethod" RENAME TO "ShippingMethod_old";
ALTER TYPE "ShippingMethod_new" RENAME TO "ShippingMethod";
DROP TYPE "public"."ShippingMethod_old";
ALTER TABLE "Order" ALTER COLUMN "shippingMethod" SET DEFAULT 'PICKUP';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "invoiceType" SET DEFAULT 'CONSUMIDOR_FINAL';
