import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, adminProcedure } from "../index";

export const departmentRouter = {
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
      }),
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
      }),
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
};
