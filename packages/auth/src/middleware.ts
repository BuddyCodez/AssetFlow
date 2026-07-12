/**
 * requireRole — server-side role guard for Elysia route handlers.
 *
 * Usage:
 *   const employee = await requireRole(ctx, ["ADMIN", "ASSET_MANAGER"]);
 *   // employee.role is guaranteed to be one of the allowed roles
 *
 * Throws:
 *   - "Unauthorized"    — no valid session
 *   - "Employee not found" — user has a session but no Employee record yet
 *   - "Forbidden"       — employee exists but role isn't in the allowed list
 */

import prisma from "@odoo-hackathon-2026/db";
import { auth } from "./index";

// Mirror the Prisma enum locally so callers don't need a db import just for types.
export type EmployeeRole = "ADMIN" | "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER";

export async function requireRole(
  ctx: { request: Request },
  roles: EmployeeRole[],
) {
  const session = await auth.api.getSession({
    headers: ctx.request.headers,
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (!employee) {
    throw new Error("Employee not found");
  }

  if (!roles.includes(employee.role as EmployeeRole)) {
    throw new Error("Forbidden");
  }

  return employee;
}

/** Convenience: require admin-only access */
export const requireAdmin = (ctx: { request: Request }) =>
  requireRole(ctx, ["ADMIN"]);

/** Convenience: require asset manager or admin */
export const requireAssetManager = (ctx: { request: Request }) =>
  requireRole(ctx, ["ADMIN", "ASSET_MANAGER"]);

/** Convenience: require department head or admin */
export const requireDepartmentHead = (ctx: { request: Request }) =>
  requireRole(ctx, ["ADMIN", "DEPARTMENT_HEAD"]);
