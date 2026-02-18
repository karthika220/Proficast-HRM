-- CreateEnum
CREATE TYPE "RoleLevel" AS ENUM ('MD', 'HR', 'MANAGER', 'TL', 'EMPLOYEE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TL';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "breakReminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "breakType" TEXT DEFAULT 'LUNCH',
ADD COLUMN     "lateNotificationSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overtimeHours" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalWorkHours" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "Escalation" ADD COLUMN     "absenceCount" INTEGER DEFAULT 0,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateCount" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "leaveYear" INTEGER NOT NULL DEFAULT 2026;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailTo" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roleLevel" "RoleLevel" NOT NULL DEFAULT 'EMPLOYEE';
