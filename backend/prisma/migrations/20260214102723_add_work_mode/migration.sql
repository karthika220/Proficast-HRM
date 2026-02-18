-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'ONSITE', 'CLIENT_OFFICE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "workMode" "WorkMode" DEFAULT 'ONSITE';
