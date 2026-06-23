-- DropIndex
DROP INDEX IF EXISTS "Order_stripeSessionId_key";

-- AlterTable
ALTER TABLE "Order" RENAME COLUMN "stripeSessionId" TO "paypalOrderId";

-- CreateIndex
CREATE UNIQUE INDEX "Order_paypalOrderId_key" ON "Order"("paypalOrderId");
