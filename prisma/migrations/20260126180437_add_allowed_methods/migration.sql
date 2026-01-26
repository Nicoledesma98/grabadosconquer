-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowedMethods" "PersonalizationMethod"[] DEFAULT ARRAY[]::"PersonalizationMethod"[];
