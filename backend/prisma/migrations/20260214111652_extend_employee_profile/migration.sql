/*
  Warnings:

  - You are about to drop the column `addedBy` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `relevant` on the `WorkExperience` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "addedBy",
DROP COLUMN "dateOfBirth",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "profilePicture" TEXT;

-- AlterTable
ALTER TABLE "WorkExperience" DROP COLUMN "relevant",
ADD COLUMN     "isRelevant" BOOLEAN NOT NULL DEFAULT false;
