// Load environment variables
import "dotenv/config";

export { appRouter, type AppRouter } from "./main-router";
export { createContext, type Context } from "./context";
export { router, publicProcedure, protectedProcedure, platformAdminProcedure, tenantAdminProcedure, tenantMemberProcedure } from "./middleware";
export { isAdmin } from "./middleware";
export { centrifugoService } from "./centrifugo";