-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('INDIVIDUAL', 'TEAM_MEETING', 'WORKSHOP', 'TRAINING', 'ONE_ON_ONE');

-- AlterTable
ALTER TABLE "maintenance_request" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "meetingType" "MeetingType";
