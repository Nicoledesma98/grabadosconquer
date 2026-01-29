-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MERCADO_PAGO', 'CASH', 'TRANSFER', 'COORDINATE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('PICKUP', 'MOTO', 'OCA', 'VIACARGO');

-- CreateEnum
CREATE TYPE "MotoZone" AS ENUM ('CABA', 'GBA1', 'GBA2');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceBusinessName" TEXT,
ADD COLUMN     "invoiceCuit" TEXT,
ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'B',
ADD COLUMN     "motoZone" "MotoZone",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "paymentSurcharge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shipApartment" TEXT,
ADD COLUMN     "shipNumber" TEXT,
ADD COLUMN     "shipPostalCode" TEXT,
ADD COLUMN     "shipStreet" TEXT,
ADD COLUMN     "shippingMethod" "ShippingMethod" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN     "vatAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vatRate" INTEGER NOT NULL DEFAULT 21;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "heightMm" INTEGER,
ADD COLUMN     "lenghtMm" INTEGER,
ADD COLUMN     "weightGrams" INTEGER,
ADD COLUMN     "widthMm" INTEGER;
