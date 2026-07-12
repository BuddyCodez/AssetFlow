import prisma from "@odoo-hackathon-2026/db";

export type ActionType =
  | "ASSET_REGISTERED"
  | "ASSET_UPDATED"
  | "ASSET_DELETED"
  | "ALLOCATION_CREATED"
  | "ALLOCATION_RETURNED"
  | "TRANSFER_REQUESTED"
  | "TRANSFER_APPROVED"
  | "TRANSFER_REJECTED"
  | "MAINTENANCE_REQUESTED"
  | "MAINTENANCE_APPROVED"
  | "MAINTENANCE_REJECTED"
  | "MAINTENANCE_RESOLVED"
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "AUDIT_CYCLE_CREATED"
  | "AUDIT_CYCLE_CLOSED"
  | "AUDIT_ITEM_MARKED"
  | "DEPARTMENT_CREATED"
  | "DEPARTMENT_UPDATED"
  | "EMPLOYEE_PROMOTED"
  | "EMPLOYEE_STATUS_CHANGED";

export type EntityType =
  | "asset"
  | "allocation"
  | "transfer"
  | "maintenance"
  | "booking"
  | "audit"
  | "department"
  | "employee"
  | "category";

/**
 * Log an activity and create a notification for the relevant employee(s).
 */
export async function logActivity(params: {
  organizationId: string;
  employeeId: string;
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  /** If set, creates a notification for this employee */
  notifyEmployeeId?: string;
  /** Optional notification message */
  notificationMessage?: string;
}) {
  const {
    organizationId,
    employeeId,
    action,
    entityType,
    entityId,
    metadata,
    notifyEmployeeId,
    notificationMessage,
  } = params;

  // Write activity log
  await prisma.activityLog.create({
    data: {
      organizationId,
      employeeId,
      action,
      entityType,
      entityId,
      metadata: (metadata as any) || undefined,
    },
  });

  // Create notification if requested
  if (notifyEmployeeId && notificationMessage) {
    await prisma.notification.create({
      data: {
        employeeId: notifyEmployeeId,
        type: action,
        message: notificationMessage,
        entityType,
        entityId,
      },
    });
  }
}
