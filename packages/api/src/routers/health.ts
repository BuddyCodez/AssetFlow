import { publicProcedure } from "../index";

export const healthRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
};
