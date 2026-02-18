/*
  Warnings:

  - You are about to drop the column `seen` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `LeaveBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearJoined` to the `LeaveBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "gracePeriodUsed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "casualUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sickUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "yearJoined" INTEGER NOT NULL DEFAULT 2024;

-- Update existing LeaveBalance records to have proper yearJoined based on user creation
UPDATE "LeaveBalance" SET "yearJoined" = 2024 WHERE "yearJoined" = 2024;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "seen",
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Notification',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'GENERAL';

-- Update existing Notification records to have proper title and type
UPDATE "Notification" SET "title" = 'System Notification', "type" = 'GENERAL' WHERE "title" = 'Notification';

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
