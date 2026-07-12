import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, assetManagerProcedure } from "../index";
import { logActivity } from "../lib/activity";

export const auditRouter = {
  list: employeeProcedure
    .handler(async ({ context }) => {
      const orgId = context.employee.organizationId;
      return await prisma.auditCycle.findMany({
        where: { organizationId: orgId },
        include: {
          auditors: true,
          _count: {
            select: { items: true },
          },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  getById: employeeProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const cycle = await prisma.auditCycle.findFirst({
        where: { id: input.id, organizationId: orgId },
        include: {
          auditors: true,
          items: {
            include: {
              asset: {
                include: {
                  category: true,
                  department: true,
                },
              },
            },
            orderBy: { checkedAt: "asc" },
          },
        },
      });
      if (!cycle) throw new ORPCError("NOT_FOUND");
      return cycle;
    }),

  create: assetManagerProcedure
    .input(
      z.object({
        scopeDepartmentId: z.string().optional().nullable(),
        scopeLocation: z.string().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        auditorIds: z.array(z.string()).optional().default([]),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      // Build asset filter for the scope
      const assetWhere: any = { organizationId: orgId };
      if (input.scopeDepartmentId) {
        assetWhere.departmentId = input.scopeDepartmentId;
      }
      if (input.scopeLocation) {
        assetWhere.location = { contains: input.scopeLocation, mode: "insensitive" };
      }

      const assets = await prisma.asset.findMany({ where: assetWhere });
      if (assets.length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "No assets match the scope. Create assets first.",
        });
      }

      const cycle = await prisma.auditCycle.create({
        data: {
          organizationId: orgId,
          scopeDepartmentId: input.scopeDepartmentId || null,
          scopeLocation: input.scopeLocation || null,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "OPEN",
          createdBy: context.employee.id,
          auditors: {
            create: input.auditorIds.map((eid) => ({
              employeeId: eid,
            })),
          },
          items: {
            create: assets.map((a) => ({
              assetId: a.id,
              result: "PENDING",
            })),
          },
        },
        include: {
          auditors: true,
          _count: { select: { items: true } },
        },
      });

      await logActivity({
        organizationId: orgId,
        employeeId: context.employee.id,
        action: "AUDIT_CYCLE_CREATED",
        entityType: "audit",
        entityId: cycle.id,
        metadata: { scope: input.scopeDepartmentId || input.scopeLocation || "all", assetCount: assets.length },
      });

      return cycle;
    }),

  assignAuditor: assetManagerProcedure
    .input(
      z.object({
        cycleId: z.string(),
        employeeId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const cycle = await prisma.auditCycle.findFirst({
        where: { id: input.cycleId, organizationId: orgId },
      });
      if (!cycle) throw new ORPCError("NOT_FOUND");
      if (cycle.status !== "OPEN") {
        throw new ORPCError("BAD_REQUEST", { message: "Only open cycles can have auditors assigned." });
      }

      await prisma.auditCycleAuditor.create({
        data: {
          auditCycleId: input.cycleId,
          employeeId: input.employeeId,
        },
      });
      return { success: true };
    }),

  markItem: employeeProcedure
    .input(
      z.object({
        itemId: z.string(),
        result: z.enum(["VERIFIED", "MISSING", "DAMAGED"]),
        notes: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const item = await prisma.auditItem.findUnique({
        where: { id: input.itemId },
        include: { auditCycle: true },
      });
      if (!item) throw new ORPCError("NOT_FOUND");
      if (item.auditCycle.status !== "OPEN") {
        throw new ORPCError("BAD_REQUEST", { message: "Audit cycle is not open." });
      }

      const updatedItem = await prisma.auditItem.update({
        where: { id: input.itemId },
        data: {
          result: input.result,
          notes: input.notes || null,
          checkedBy: context.employee.id,
          checkedAt: new Date(),
        },
      });

      await logActivity({
        organizationId: item.auditCycle.organizationId,
        employeeId: context.employee.id,
        action: "AUDIT_ITEM_MARKED",
        entityType: "audit",
        entityId: input.itemId,
        metadata: { result: input.result, cycleId: item.auditCycleId },
      });

      return updatedItem;
    }),

  close: assetManagerProcedure
    .input(z.object({ cycleId: z.string() }))
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const cycle = await prisma.auditCycle.findFirst({
        where: { id: input.cycleId, organizationId: orgId },
        include: {
          items: {
            where: { result: "MISSING" },
          },
        },
      });
      if (!cycle) throw new ORPCError("NOT_FOUND");
      if (cycle.status !== "OPEN") {
        throw new ORPCError("BAD_REQUEST", { message: "This cycle is already closed." });
      }

      // Mark missing assets as LOST
      const missingItemIds = cycle.items.map((i) => i.id);
      if (missingItemIds.length > 0) {
        const missingItems = await prisma.auditItem.findMany({
          where: { id: { in: missingItemIds } },
        });
        const missingAssetIds = missingItems.map((i) => i.assetId);

        await prisma.asset.updateMany({
          where: { id: { in: missingAssetIds } },
          data: { status: "LOST" },
        });
      }

      await prisma.auditCycle.update({
        where: { id: input.cycleId },
        data: { status: "CLOSED" },
      });

      await logActivity({
        organizationId: orgId,
        employeeId: context.employee.id,
        action: "AUDIT_CYCLE_CLOSED",
        entityType: "audit",
        entityId: input.cycleId,
        metadata: { missingItemsCount: missingItemIds.length },
      });

      return { success: true, missingItemsCount: missingItemIds.length };
    }),

  getReport: employeeProcedure
    .input(z.object({ cycleId: z.string() }))
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const cycle = await prisma.auditCycle.findFirst({
        where: { id: input.cycleId, organizationId: orgId },
        include: {
          items: {
            include: { asset: { include: { category: true, department: true } } },
          },
          auditors: true,
        },
      });
      if (!cycle) throw new ORPCError("NOT_FOUND");

      const total = cycle.items.length;
      const verified = cycle.items.filter((i) => i.result === "VERIFIED").length;
      const missing = cycle.items.filter((i) => i.result === "MISSING").length;
      const damaged = cycle.items.filter((i) => i.result === "DAMAGED").length;
      const pending = cycle.items.filter((i) => i.result === "PENDING").length;

      return {
        cycle: {
          id: cycle.id,
          status: cycle.status,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
          scopeDepartmentId: cycle.scopeDepartmentId,
          scopeLocation: cycle.scopeLocation,
        },
        summary: { total, verified, missing, damaged, pending },
        items: cycle.items,
        auditorCount: cycle.auditors.length,
      };
    }),
};
