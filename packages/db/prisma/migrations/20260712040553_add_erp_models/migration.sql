/*
  Warnings:

  - You are about to drop the column `department` on the `employee` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditCycleStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AuditItemResult" AS ENUM ('PENDING', 'VERIFIED', 'MISSING', 'DAMAGED');

-- AlterTable
ALTER TABLE "employee" DROP COLUMN "department",
ADD COLUMN     "departmentId" TEXT;

-- CreateTable
CREATE TABLE "department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentDepartmentId" TEXT,
    "headEmployeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30),
    "condition" TEXT,
    "location" TEXT,
    "photoUrl" TEXT,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "departmentId" TEXT,
    "currentHolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT,
    "departmentId" TEXT,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "checkinNotes" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocatedBy" TEXT NOT NULL,

    CONSTRAINT "allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_request" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromEmployeeId" TEXT,
    "toEmployeeId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "transfer_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "departmentId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_request" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "photoUrl" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "technicianName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "maintenance_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scopeDepartmentId" TEXT,
    "scopeLocation" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "audit_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycle_auditor" (
    "auditCycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "audit_cycle_auditor_pkey" PRIMARY KEY ("auditCycleId","employeeId")
);

-- CreateTable
CREATE TABLE "audit_item" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "result" "AuditItemResult" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "audit_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "department_organizationId_idx" ON "department"("organizationId");

-- CreateIndex
CREATE INDEX "asset_category_organizationId_idx" ON "asset_category"("organizationId");

-- CreateIndex
CREATE INDEX "asset_organizationId_status_idx" ON "asset"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_organizationId_assetTag_key" ON "asset"("organizationId", "assetTag");

-- CreateIndex
CREATE INDEX "allocation_assetId_status_idx" ON "allocation"("assetId", "status");

-- CreateIndex
CREATE INDEX "allocation_employeeId_idx" ON "allocation"("employeeId");

-- CreateIndex
CREATE INDEX "transfer_request_assetId_status_idx" ON "transfer_request"("assetId", "status");

-- CreateIndex
CREATE INDEX "booking_assetId_startTime_endTime_idx" ON "booking"("assetId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "maintenance_request_assetId_status_idx" ON "maintenance_request"("assetId", "status");

-- CreateIndex
CREATE INDEX "audit_cycle_organizationId_status_idx" ON "audit_cycle"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_item_auditCycleId_assetId_key" ON "audit_item"("auditCycleId", "assetId");

-- CreateIndex
CREATE INDEX "notification_employeeId_isRead_idx" ON "notification"("employeeId", "isRead");

-- CreateIndex
CREATE INDEX "activity_log_organizationId_createdAt_idx" ON "activity_log"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation" ADD CONSTRAINT "allocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_request" ADD CONSTRAINT "maintenance_request_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycle_auditor" ADD CONSTRAINT "audit_cycle_auditor_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "audit_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_item" ADD CONSTRAINT "audit_item_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "audit_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_item" ADD CONSTRAINT "audit_item_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
