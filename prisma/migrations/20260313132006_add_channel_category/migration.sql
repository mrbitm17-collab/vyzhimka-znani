-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Channel_category_idx" ON "Channel"("category");
