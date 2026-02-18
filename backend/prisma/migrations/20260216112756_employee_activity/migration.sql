/*
  Warnings:

  - You are about to drop the `employee_activity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "employee_activity";

-- CreateTable
CREATE TABLE "EmployeeActivity" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "workingMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeActivity_employeeId_date_key" ON "EmployeeActivity"("employeeId", "date");
