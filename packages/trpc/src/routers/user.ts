import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, platformAdminProcedure, tenantAdminProcedure } from "../base";

export const userRouter = router({
  // Get user by ID (protected - users can only get their own info or if they're admin)
  getUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Users can only get their own info, or platform admins can get any user
      if (ctx.session.user.id !== input.id && ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      return user;
    }),

  // Get current user (protected)
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const user = await ctx.db.user.findUnique({
      where: { email: ctx.session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        platformRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    
    return user;
  }),

  // Update user (protected - users can only update their own info)
  updateUser: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      image: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Users can only update their own info
      if (ctx.session.user.id !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only update your own profile" });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          image: input.image,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),

  // Get all users (platform admin only)
  getAllUsers: platformAdminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    
    return users;
  }),

  // Delete user (platform admin only)
  deleteUser: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Prevent admin from deleting themselves
      if (user.email === ctx.session.user.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" });
      }

      await ctx.db.user.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
