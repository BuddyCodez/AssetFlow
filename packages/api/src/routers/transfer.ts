import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, assetManagerProcedure } from "../index";

export const transferRouter = {
  request: employeeProcedure
    .input(
      z.object({
        assetId: z.string(),
        toEmployeeId: z.string(),
        reason: z.string().optional().nullable(),
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

      return await prisma.transferRequest.create({
        data: {
          assetId: input.assetId,
          fromEmployeeId: asset.currentHolderId || null,
          toEmployeeId: input.toEmployeeId,
          requestedBy: context.employee.id,
          status: "REQUESTED",
        },
      });
    }),

  list: employeeProcedure.handler(async ({ context }) => {
    const orgId = context.employee.organizationId;

    const orgAssets = await prisma.asset.findMany({
      where: { organizationId: orgId },
    });
    const assetIds = orgAssets.map((a) => a.id);
    const assetMap = new Map(orgAssets.map((a) => [a.id, a]));

    const requests = await prisma.transferRequest.findMany({
      where: {
        assetId: { in: assetIds },
      },
      orderBy: { createdAt: "desc" },
    });

    const empIds = new Set<string>();
    requests.forEach((r) => {
      if (r.fromEmployeeId) empIds.add(r.fromEmployeeId);
      empIds.add(r.toEmployeeId);
      empIds.add(r.requestedBy);
    });

    const employees = await prisma.employee.findMany({
      where: { id: { in: Array.from(empIds) } },
      include: { user: true },
    });

    const empMap = new Map(employees.map((e) => [e.id, e]));

    return requests.map((r) => ({
      ...r,
      asset: assetMap.get(r.assetId) || null,
      fromEmployee: r.fromEmployeeId ? empMap.get(r.fromEmployeeId) : null,
      toEmployee: empMap.get(r.toEmployeeId) || null,
      requestedByEmployee: empMap.get(r.requestedBy) || null,
    }));
  }),

  approve: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.transferRequest.findUnique({
        where: { id: input.requestId },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      const asset = await prisma.asset.findFirst({
        where: { id: request.assetId, organizationId: orgId },
      });

      if (!asset) {
        throw new ORPCError("NOT_FOUND");
      }

      if (request.status !== "REQUESTED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "This transfer request is already resolved.",
        });
      }

      const activeAlloc = await prisma.allocation.findFirst({
        where: { assetId: request.assetId, status: "ACTIVE" },
      });

      if (activeAlloc) {
        await prisma.allocation.update({
          where: { id: activeAlloc.id },
          data: {
            status: "RETURNED",
            returnedAt: new Date(),
            checkinNotes: "Transferred to another employee",
          },
        });
      }

      await prisma.allocation.create({
        data: {
          assetId: request.assetId,
          employeeId: request.toEmployeeId,
          allocatedBy: context.employee.id,
          status: "ACTIVE",
        },
      });

      await prisma.transferRequest.update({
        where: { id: input.requestId },
        data: {
          status: "APPROVED",
          resolvedAt: new Date(),
          approvedBy: context.employee.id,
        },
      });

      await prisma.asset.update({
        where: { id: request.assetId },
        data: {
          status: "ALLOCATED",
          currentHolderId: request.toEmployeeId,
        },
      });

      return { success: true };
    }),

  reject: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.transferRequest.findUnique({
        where: { id: input.requestId },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      const asset = await prisma.asset.findFirst({
        where: { id: request.assetId, organizationId: orgId },
      });

      if (!asset) {
        throw new ORPCError("NOT_FOUND");
      }

      await prisma.transferRequest.update({
        where: { id: input.requestId },
        data: {
          status: "REJECTED",
          resolvedAt: new Date(),
          approvedBy: context.employee.id,
        },
      });

      return { success: true };
    }),
};
