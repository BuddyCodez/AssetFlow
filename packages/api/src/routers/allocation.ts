import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { assetManagerProcedure } from "../index";

export const allocationRouter = {
  allocate: assetManagerProcedure
    .input(
      z.object({
        assetId: z.string(),
        employeeId: z.string().optional().nullable(),
        departmentId: z.string().optional().nullable(),
        expectedReturnDate: z.string().optional().nullable(),
        condition: z.string().optional().nullable(),
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

      if (asset.status !== "AVAILABLE") {
        throw new ORPCError("CONFLICT", {
          message: `This asset is not available for allocation. Current status: ${asset.status}`,
        });
      }

      const allocation = await prisma.allocation.create({
        data: {
          assetId: input.assetId,
          employeeId: input.employeeId || null,
          departmentId: input.departmentId || null,
          expectedReturnDate: input.expectedReturnDate
            ? new Date(input.expectedReturnDate)
            : null,
          checkinNotes: input.condition || null,
          allocatedBy: context.employee.id,
          status: "ACTIVE",
        },
      });

      await prisma.asset.update({
        where: { id: input.assetId },
        data: {
          status: "ALLOCATED",
          currentHolderId: input.employeeId || null,
          departmentId: input.departmentId || asset.departmentId,
          condition: input.condition || undefined,
        },
      });

      return allocation;
    }),

  markReturned: assetManagerProcedure
    .input(
      z.object({
        assetId: z.string(),
        checkinNotes: z.string().optional().nullable(),
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

      const activeAlloc = await prisma.allocation.findFirst({
        where: { assetId: input.assetId, status: "ACTIVE" },
      });

      if (!activeAlloc && asset.status !== "ALLOCATED") {
        throw new ORPCError("CONFLICT", {
          message:
            "This asset does not have an active allocation record or is not allocated.",
        });
      }

      if (activeAlloc) {
        await prisma.allocation.update({
          where: { id: activeAlloc.id },
          data: {
            status: "RETURNED",
            returnedAt: new Date(),
            checkinNotes: input.checkinNotes || null,
          },
        });
      }

      await prisma.asset.update({
        where: { id: input.assetId },
        data: {
          status: "AVAILABLE",
          currentHolderId: null,
        },
      });

      return { success: true };
    }),
};
