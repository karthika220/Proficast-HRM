/*
  Warnings:

  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "breakEnd" TIMESTAMP(3),
ADD COLUMN     "breakMinutes" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "breakStart" TIMESTAMP(3),
ADD COLUMN     "checkInCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateMinutes" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have proper updatedAt values
UPDATE "Attendance" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
