import type { RouterClient } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";

import {
  publicProcedure,
  adminProcedure,
  employeeProcedure,
} from "../index";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),

  // ─── Department Management ──────────────────────────────────────────────────
  department: {
    list: employeeProcedure.handler(async ({ context }) => {
      const orgId = context.employee.organizationId;
      return await prisma.department.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
        include: {
          parentDepartment: true,
        },
      });
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          parentDepartmentId: z.string().optional().nullable(),
          headEmployeeId: z.string().optional().nullable(),
        })
      )
      .handler(async ({ input, context }) => {
        const orgId = context.employee.organizationId;
        return await prisma.department.create({
          data: {
            organizationId: orgId,
            name: input.name,
            parentDepartmentId: input.parentDepartmentId || null,
            headEmployeeId: input.headEmployeeId || null,
            isActive: true,
          },
        });
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1, "Name is required"),
          parentDepartmentId: z.string().optional().nullable(),
          headEmployeeId: z.string().optional().nullable(),
          isActive: z.boolean().optional(),
        })
      )
      .handler(async ({ input }) => {
        return await prisma.department.update({
          where: { id: input.id },
          data: {
            name: input.name,
            parentDepartmentId: input.parentDepartmentId || null,
            headEmployeeId: input.headEmployeeId || null,
            isActive: input.isActive !== undefined ? input.isActive : undefined,
          },
        });
      }),
  },

  // ─── Asset Category Management ──────────────────────────────────────────────
  category: {
    list: employeeProcedure.handler(async ({ context }) => {
      const orgId = context.employee.organizationId;
      return await prisma.assetCategory.findMany({
        where: { organizationId: orgId },
        orderBy: { name: "asc" },
      });
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1, "Name is required"),
          customFields: z.record(z.string(), z.any()).optional().nullable(),
        })
      )
      .handler(async ({ input, context }) => {
        const orgId = context.employee.organizationId;
        return await prisma.assetCategory.create({
          data: {
            organizationId: orgId,
            name: input.name,
            customFields: (input.customFields as any) || undefined,
          },
        });
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .handler(async ({ input }) => {
        return await prisma.assetCategory.delete({
          where: { id: input.id },
        });
      }),
  },

  // ─── Employee Directory & Promotion ─────────────────────────────────────────
  employee: {
    list: employeeProcedure.handler(async ({ context }) => {
      const orgId = context.employee.organizationId;
      return await prisma.employee.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
          department: true,
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });
    }),

    promote: adminProcedure
      .input(
        z.object({
          employeeId: z.string(),
          role: z.enum(["ADMIN", "EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER"]),
          departmentId: z.string().optional().nullable(),
        })
      )
      .handler(async ({ input, context }) => {
        // Prevent self-demotion/self-role-changing for safety
        if (input.employeeId === context.employee.id) {
          throw new Error("You cannot change your own role.");
        }
        return await prisma.employee.update({
          where: { id: input.employeeId },
          data: {
            role: input.role,
            departmentId: input.departmentId || null,
          },
        });
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          employeeId: z.string(),
          isActive: z.boolean(),
        })
      )
      .handler(async ({ input, context }) => {
        if (input.employeeId === context.employee.id) {
          throw new Error("You cannot change your own status.");
        }
        return await prisma.employee.update({
          where: { id: input.employeeId },
          data: {
            isActive: input.isActive,
          },
        });
      }),
  },
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
