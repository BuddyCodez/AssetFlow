import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure } from "../index";

export const notificationRouter = {
  /**
   * List notifications for the current employee.
   * Ordered by newest first.
   */
  list: employeeProcedure
    .input(
      z
        .object({
          unreadOnly: z.boolean().optional().default(false),
          limit: z.number().optional().default(50),
        })
        .optional()
        .default({ unreadOnly: false, limit: 50 }),
    )
    .handler(async ({ input, context }) => {
      const where: any = {
        employeeId: context.employee.id,
      };
      if (input.unreadOnly) {
        where.isRead = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      const unreadCount = await prisma.notification.count({
        where: { employeeId: context.employee.id, isRead: false },
      });

      return { notifications, unreadCount };
    }),

  /**
   * Mark a single notification as read.
   */
  markRead: employeeProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const notification = await prisma.notification.findFirst({
        where: { id: input.id, employeeId: context.employee.id },
      });
      if (!notification) {
        return { success: false };
      }
      await prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true },
      });
      return { success: true };
    }),

  /**
   * Mark all notifications as read for the current employee.
   */
  markAllRead: employeeProcedure.handler(async ({ context }) => {
    await prisma.notification.updateMany({
      where: { employeeId: context.employee.id, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }),

  /**
   * List activity logs for the organization.
   */
  activityLog: employeeProcedure
    .input(
      z
        .object({
          limit: z.number().optional().default(100),
          entityType: z.string().optional().nullable(),
          action: z.string().optional().nullable(),
        })
        .optional()
        .default({ limit: 100, entityType: null, action: null }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const where: any = { organizationId: orgId };
      if (input.entityType) where.entityType = input.entityType;
      if (input.action) where.action = input.action;

      const logs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      // Fetch employee info for each log
      const empIds = Array.from(new Set(logs.map((l) => l.employeeId)));
      const employees = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        include: {
          user: {
            select: { name: true, email: true, image: true },
          },
        },
      });
      const empMap = new Map(employees.map((e) => [e.id, e]));

      return logs.map((log) => ({
        ...log,
        metadata: log.metadata as Record<string, unknown> | null,
        employee: empMap.get(log.employeeId) || null,
      }));
    }),
};
