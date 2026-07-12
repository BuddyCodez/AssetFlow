import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, assetManagerProcedure } from "../index";
import { logActivity } from "../lib/activity";

const AssetStatusEnum = z.enum([
  "AVAILABLE",
  "ALLOCATED",
  "RESERVED",
  "UNDER_MAINTENANCE",
  "LOST",
  "RETIRED",
  "DISPOSED",
]);

export const assetRouter = {
  list: employeeProcedure
    .input(
      z
        .object({
          search: z.string().optional().nullable(),
          categoryId: z.string().optional().nullable(),
          status: AssetStatusEnum.optional().nullable(),
          departmentId: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const search = input?.search?.trim();

      return await prisma.asset.findMany({
        where: {
          organizationId: orgId,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { assetTag: { contains: search, mode: "insensitive" } },
                  { serialNumber: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(input?.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.departmentId ? { departmentId: input.departmentId } : {}),
        },
        include: {
          category: true,
          department: true,
        },
        orderBy: {
          assetTag: "desc",
        },
      });
    }),

  register: employeeProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        categoryId: z.string(),
        serialNumber: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        isBookable: z.boolean().optional().default(false),
        status: AssetStatusEnum.optional().default("AVAILABLE"),
        departmentId: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const count = await prisma.asset.count({
        where: { organizationId: orgId },
      });
      const tagNumber = String(count + 1).padStart(4, "0");
      const assetTag = `AF-${tagNumber}`;

      const asset = await prisma.asset.create({
        data: {
          organizationId: orgId,
          assetTag,
          name: input.name,
          categoryId: input.categoryId,
          serialNumber: input.serialNumber || null,
          location: input.location || null,
          isBookable: input.isBookable,
          status: input.status,
          departmentId: input.departmentId || null,
        },
        include: {
          category: true,
          department: true,
        },
      });

      await logActivity({
        organizationId: orgId,
        employeeId: context.employee.id,
        action: "ASSET_REGISTERED",
        entityType: "asset",
        entityId: asset.id,
        metadata: { name: asset.name, assetTag: asset.assetTag },
      });

      return asset;
    }),

  update: assetManagerProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        categoryId: z.string().optional(),
        serialNumber: z.string().optional().nullable(),
        location: z.string().optional().nullable(),
        isBookable: z.boolean().optional(),
        status: AssetStatusEnum.optional(),
        departmentId: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const asset = await prisma.asset.findFirst({
        where: { id: input.id, organizationId: orgId },
      });
      if (!asset) {
        throw new ORPCError("NOT_FOUND");
      }

      return await prisma.asset.update({
        where: { id: input.id },
        data: {
          name: input.name !== undefined ? input.name : undefined,
          categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
          serialNumber: input.serialNumber !== undefined ? input.serialNumber : undefined,
          location: input.location !== undefined ? input.location : undefined,
          isBookable: input.isBookable !== undefined ? input.isBookable : undefined,
          status: input.status !== undefined ? input.status : undefined,
          departmentId: input.departmentId !== undefined ? input.departmentId : undefined,
        },
        include: {
          category: true,
          department: true,
        },
      });
    }),

  deleteBulk: assetManagerProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const deleted = await prisma.asset.deleteMany({
        where: {
          id: { in: input.ids },
          organizationId: orgId,
        },
      });
      return { count: deleted.count };
    }),

  getHistory: employeeProcedure
    .input(
      z.object({
        assetId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, organizationId: orgId },
      });
      if (!asset) {
        throw new ORPCError("NOT_FOUND");
      }

      const allocations = await prisma.allocation.findMany({
        where: { assetId: input.assetId },
        orderBy: { allocatedAt: "desc" },
      });

      const empIds = new Set<string>();
      const deptIds = new Set<string>();
      allocations.forEach((a) => {
        if (a.employeeId) empIds.add(a.employeeId);
        if (a.departmentId) deptIds.add(a.departmentId);
      });

      const employees = await prisma.employee.findMany({
        where: { id: { in: Array.from(empIds) } },
        include: { user: true },
      });
      const departments = await prisma.department.findMany({
        where: { id: { in: Array.from(deptIds) } },
      });

      const empMap = new Map(employees.map((e) => [e.id, e]));
      const deptMap = new Map(departments.map((d) => [d.id, d]));

      const history = allocations.map((a) => ({
        ...a,
        employee: a.employeeId ? empMap.get(a.employeeId) : null,
        department: a.departmentId ? deptMap.get(a.departmentId) : null,
      }));

      return { allocations: history };
    }),
};
