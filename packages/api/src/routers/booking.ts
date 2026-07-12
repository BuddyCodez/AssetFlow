import { ORPCError } from "@orpc/server";
import { z } from "zod";
import prisma from "@odoo-hackathon-2026/db";
import { employeeProcedure } from "../index";

export const bookingRouter = {
  list: employeeProcedure
    .input(
      z.object({
        assetId: z.string().optional().nullable(),
        date: z.string(),
        endDate: z.string().optional().nullable(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const startOfDay = new Date(`${input.date}T00:00:00.000Z`);
      const endOfDay = new Date(
        `${input.endDate || input.date}T23:59:59.999Z`,
      );

      const bookings = await prisma.booking.findMany({
        where: {
          asset: {
            organizationId: orgId,
            ...(input.assetId ? { id: input.assetId } : {}),
          },
          status: { in: ["UPCOMING", "ONGOING", "COMPLETED"] },
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
        },
        orderBy: { startTime: "asc" },
      });

      const empIds = Array.from(new Set(bookings.map((b) => b.bookedById)));
      const employees = await prisma.employee.findMany({
        where: { id: { in: empIds } },
        include: {
          user: true,
          department: true,
        },
      });

      const empMap = new Map(employees.map((e) => [e.id, e]));

      return bookings.map((b) => ({
        ...b,
        bookedBy: empMap.get(b.bookedById) || null,
      }));
    }),

  create: employeeProcedure
    .input(
      z.object({
        assetId: z.string(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        departmentId: z.string().optional().nullable(),
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

      if (!asset.isBookable) {
        throw new ORPCError("BAD_REQUEST", {
          message: "This resource is not marked as bookable.",
        });
      }

      const start = new Date(input.startTime);
      const end = new Date(input.endTime);

      if (start >= end) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Start time must be before end time.",
        });
      }

      const overlap = await prisma.booking.findFirst({
        where: {
          assetId: input.assetId,
          status: { in: ["UPCOMING", "ONGOING"] },
          OR: [
            {
              startTime: { lte: start },
              endTime: { gt: start },
            },
            {
              startTime: { lt: end },
              endTime: { gte: end },
            },
            {
              startTime: { gte: start },
              endTime: { lte: end },
            },
          ],
        },
      });

      if (overlap) {
        throw new ORPCError("CONFLICT", {
          message:
            "This slot is already booked or overlaps with an existing booking.",
        });
      }

      const booking = await prisma.booking.create({
        data: {
          assetId: input.assetId,
          bookedById: context.employee.id,
          departmentId:
            input.departmentId || context.employee.departmentId || null,
          startTime: start,
          endTime: end,
          status: "UPCOMING",
        },
      });

      return booking;
    }),

  cancel: employeeProcedure
    .input(
      z.object({
        bookingId: z.string(),
      }),
    )
    .handler(async ({ input, context }) => {
      const orgId = context.employee.organizationId;

      const booking = await prisma.booking.findFirst({
        where: {
          id: input.bookingId,
          asset: {
            organizationId: orgId,
          },
        },
      });

      if (!booking) {
        throw new ORPCError("NOT_FOUND");
      }

      if (
        booking.bookedById !== context.employee.id &&
        context.employee.role !== "ADMIN" &&
        context.employee.role !== "ASSET_MANAGER"
      ) {
        throw new ORPCError("FORBIDDEN", {
          message: "You are not authorized to cancel this booking.",
        });
      }

      return await prisma.booking.update({
        where: { id: input.bookingId },
        data: {
          status: "CANCELLED",
        },
      });
    }),
};
