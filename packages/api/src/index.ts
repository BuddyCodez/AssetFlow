import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";
import prisma, { type EmployeeRole } from "@odoo-hackathon-2026/db";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export const requireRole = (...roles: EmployeeRole[]) =>
  o.middleware(async ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }
    const employee = await prisma.employee.findUnique({
      where: { userId: context.session.user.id },
    });
    if (!employee || !roles.includes(employee.role as any) || !employee.isActive) {
      throw new ORPCError("FORBIDDEN");
    }
    return next({
      context: {
        session: context.session,
        employee,
      },
    });
  });

export const adminProcedure = protectedProcedure.use(requireRole("ADMIN"));
export const assetManagerProcedure = protectedProcedure.use(requireRole("ADMIN", "ASSET_MANAGER"));
export const departmentHeadProcedure = protectedProcedure.use(requireRole("ADMIN", "DEPARTMENT_HEAD"));
export const employeeProcedure = protectedProcedure.use(requireRole("ADMIN", "ASSET_MANAGER", "DEPARTMENT_HEAD", "EMPLOYEE"));
