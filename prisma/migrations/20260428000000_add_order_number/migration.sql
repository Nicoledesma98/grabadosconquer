ALTER TABLE "Order" ADD COLUMN "orderNumber" SERIAL NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderNumber_key" UNIQUE ("orderNumber");
