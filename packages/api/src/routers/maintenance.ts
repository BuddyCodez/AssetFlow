import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure, assetManagerProcedure } from "../index";

export const maintenanceRouter = {
  list: employeeProcedure
    .handler(async ({ context }) => {
      const orgId = context.employee.organizationId;

      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          asset: {
            organizationId: orgId,
          },
        },
        include: {
          asset: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Fetch employees separately (no Prisma relation on raisedById)
      const empIds = Array.from(new Set(requests.map((r) => r.raisedById)));
      const employees = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      const empMap = new Map(employees.map((e) => [e.id, e]));

      return requests.map((r) => ({
        ...r,
        raisedBy: empMap.get(r.raisedById) || null,
      }));
    }),

  getHistory: employeeProcedure
    .input(
      z.object({
        assetId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const requests = await prisma.maintenanceRequest.findMany({
        where: {
          assetId: input.assetId,
          asset: {
            organizationId: orgId,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const empIds = Array.from(new Set(requests.map((r) => r.raisedById)));
      const employees = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      const empMap = new Map(employees.map((e) => [e.id, e]));

      return requests.map((r) => ({
        ...r,
        raisedBy: empMap.get(r.raisedById) || null,
      }));
    }),

  create: employeeProcedure
    .input(
      z.object({
        assetId: z.string(),
        issueDescription: z.string(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        photoUrl: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const asset = await prisma.asset.findFirst({
        where: { id: input.assetId, organizationId: orgId },
      });

      if (!asset) {
        throw new ORPCError("NOT_FOUND", { message: "Asset not found." });
      }

      const request = await prisma.maintenanceRequest.create({
        data: {
          assetId: input.assetId,
          raisedById: context.employee.id,
          issueDescription: input.issueDescription,
          priority: input.priority,
          photoUrl: input.photoUrl || null,
          status: "PENDING",
        },
      });

      return request;
    }),

  approve: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.maintenanceRequest.findFirst({
        where: {
          id: input.requestId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND", { message: "Request not found." });
      }

      if (request.status !== "PENDING") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only pending requests can be approved.",
        });
      }

      await prisma.$transaction([
        prisma.maintenanceRequest.update({
          where: { id: input.requestId },
          data: {
            status: "APPROVED",
            approvedBy: context.employee.id,
            approvedAt: new Date(),
          },
        }),
        prisma.asset.update({
          where: { id: request.assetId },
          data: {
            status: "UNDER_MAINTENANCE",
          },
        }),
      ]);

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

      const request = await prisma.maintenanceRequest.findFirst({
        where: {
          id: input.requestId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND", { message: "Request not found." });
      }

      await prisma.maintenanceRequest.update({
        where: { id: input.requestId },
        data: {
          status: "REJECTED",
          resolvedAt: new Date(),
        },
      });

      return { success: true };
    }),

  assignTechnician: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
        technicianName: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.maintenanceRequest.findFirst({
        where: {
          id: input.requestId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND", { message: "Request not found." });
      }

      if (request.status !== "APPROVED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only approved requests can have a technician assigned.",
        });
      }

      await prisma.maintenanceRequest.update({
        where: { id: input.requestId },
        data: {
          status: "TECHNICIAN_ASSIGNED",
          technicianName: input.technicianName,
        },
      });

      return { success: true };
    }),

  startWork: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.maintenanceRequest.findFirst({
        where: {
          id: input.requestId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      if (request.status !== "TECHNICIAN_ASSIGNED") {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Technician must be assigned before starting work.",
        });
      }

      await prisma.maintenanceRequest.update({
        where: { id: input.requestId },
        data: {
          status: "IN_PROGRESS",
        },
      });

      return { success: true };
    }),

  resolve: assetManagerProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const request = await prisma.maintenanceRequest.findFirst({
        where: {
          id: input.requestId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND");
      }

      if (request.status !== "IN_PROGRESS") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only in-progress requests can be resolved.",
        });
      }

      await prisma.$transaction([
        prisma.maintenanceRequest.update({
          where: { id: input.requestId },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
          },
        }),
        prisma.asset.update({
          where: { id: request.assetId },
          data: {
            status: "AVAILABLE",
          },
        }),
      ]);

      return { success: true };
    }),
};
