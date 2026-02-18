-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "attendanceState" TEXT DEFAULT 'CHECKED_IN',
ADD COLUMN     "totalBreakMinutes" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "BreakSession" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "breakType" TEXT DEFAULT 'LUNCH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BreakSession" ADD CONSTRAINT "BreakSession_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
