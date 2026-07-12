import type { RouterClient } from "@orpc/server";import { healthRouter } from "./health";
import { departmentRouter } from "./department";
import { categoryRouter } from "./category";
import { employeeRouter } from "./employee";
import { assetRouter } from "./asset";
import { allocationRouter } from "./allocation";
import { transferRouter } from "./transfer";
import { bookingRouter } from "./booking";
import { maintenanceRouter } from "./maintenance";
import { auditRouter } from "./audit";

export const appRouter = {
  healthCheck: healthRouter.healthCheck,

  department: departmentRouter,
  category: categoryRouter,
  employee: employeeRouter,
  asset: assetRouter,
  allocation: allocationRouter,
  transfer: transferRouter,
  booking: bookingRouter,
  maintenance: maintenanceRouter,
  audit: auditRouter,
} as const;

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
