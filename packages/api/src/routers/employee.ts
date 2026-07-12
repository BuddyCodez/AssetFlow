import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, adminProcedure } from "../index";

export const employeeRouter = {
  current: employeeProcedure.handler(async ({ context }) => {
    return context.employee;
  }),

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
      }),
    )
    .handler(async ({ input, context }) => {
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
      }),
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
};
