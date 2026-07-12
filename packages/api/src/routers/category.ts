import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, adminProcedure } from "../index";
import { logActivity } from "../lib/activity";

export const categoryRouter = {
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
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;
      const cat = await prisma.assetCategory.create({
        data: {
          organizationId: orgId,
          name: input.name,
          customFields: (input.customFields as any) || undefined,
        },
      });

      await logActivity({
        organizationId: orgId,
        employeeId: context.employee.id,
        action: "ASSET_REGISTERED",
        entityType: "category",
        entityId: cat.id,
        metadata: { name: input.name },
      });

      return cat;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      return await prisma.assetCategory.delete({
        where: { id: input.id },
      });
    }),
};
