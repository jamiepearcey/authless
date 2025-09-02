import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, platformAdminProcedure, tenantAdminProcedure } from "../middleware";
import bcrypt from "bcryptjs";
import { imageUploadService } from "../image-upload-service";
import { OutboxEvents } from "../outbox-service";

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
          bio: true,
          location: true,
          website: true,
          timezone: true,
          locale: true,
          emailNotifications: true,
          marketingEmails: true,
          securityAlerts: true,
          activityUpdates: true,
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
        bio: true,
        location: true,
        website: true,
        timezone: true,
        locale: true,
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
        activityUpdates: true,
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
      bio: z.string().optional(),
      location: z.string().optional(),
      website: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
      emailNotifications: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      securityAlerts: z.boolean().optional(),
      activityUpdates: z.boolean().optional(),
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
          bio: input.bio,
          location: input.location,
          website: input.website,
          timezone: input.timezone,
          locale: input.locale,
          emailNotifications: input.emailNotifications,
          marketingEmails: input.marketingEmails,
          securityAlerts: input.securityAlerts,
          activityUpdates: input.activityUpdates,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          location: true,
          website: true,
          timezone: true,
          locale: true,
          emailNotifications: true,
          marketingEmails: true,
          securityAlerts: true,
          activityUpdates: true,
          updatedAt: true,
        },
      });

      // Publish user updated event
      await ctx.outbox.publishUserEvent(
        OutboxEvents.USER_UPDATED,
        input.id,
        ctx.session.user.tenantId || null,
        {
          userId: input.id,
          email: updatedUser.email,
          name: updatedUser.name || undefined,
          action: "profile_updated",
          metadata: {
            updatedFields: Object.keys(input).filter(key => key !== 'id' && input[key as keyof typeof input] !== undefined),
            timestamp: new Date().toISOString(),
          },
        }
      );

      return updatedUser;
    }),

  // Change password (protected - users can only change their own password)
  changePassword: protectedProcedure
    .input(z.object({
      id: z.string(),
      currentPassword: z.string(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Users can only change their own password
      if (ctx.session.user.id !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only change your own password" });
      }

      // Get user with hashed password
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          hashedPassword: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (!user.hashedPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User does not have a password set" });
      }

      /*
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.hashedPassword);
      if (!isCurrentPasswordValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      }
      */

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(input.newPassword, 12);

      // Update password
      await ctx.db.user.update({
        where: { id: input.id },
        data: {
          hashedPassword: hashedNewPassword,
        },
      });

      // Publish password changed event
      await ctx.outbox.publishUserEvent(
        OutboxEvents.AUTH_PASSWORD_CHANGED,
        input.id,
        ctx.session.user.tenantId || null,
        {
          userId: input.id,
          email: ctx.session.user.email,
          name: ctx.session.user.name || "",
          action: "password_changed",
          metadata: {
            timestamp: new Date().toISOString(),
            ipAddress: "unknown", // Could be passed from request if needed
          },
        }
      );

      return { success: true, message: "Password changed successfully" };
    }),

  // Update profile photo (protected - users can only update their own photo)
  updateProfilePhoto: protectedProcedure
    .input(z.object({
      userId: z.string(),
      imageFile: z.any(), // This will be handled by the client
    }))
    .mutation(async ({ ctx, input }) => {
      // Users can only update their own photo
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only update your own profile photo" });
      }

      try {
        // Upload the image using the image upload service
        const uploadResult = await imageUploadService.uploadProfilePhoto({
          userId: input.userId,
          imageFile: input.imageFile,
        });

        if (!uploadResult.success) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: uploadResult.error || "Failed to upload image" 
          });
        }

        // Update the user's profile with the new image URL
        const updatedUser = await ctx.db.user.update({
          where: { id: input.userId },
          data: {
            image: uploadResult.imageUrl,
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
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error('Error updating profile photo:', error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to update profile photo" 
        });
      }
    }),

  // Delete profile photo (protected - users can only delete their own photo)
  deleteProfilePhoto: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Users can only delete their own photo
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only delete your own profile photo" });
      }

      try {
        // Get current user to check if they have an image
        const currentUser = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { image: true },
        });

        if (!currentUser?.image) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No profile photo to delete" 
          });
        }

        // Delete the image from the storage service
        const deleteResult = await imageUploadService.deleteProfilePhoto(
          input.userId, 
          currentUser.image
        );

        if (!deleteResult) {
          console.warn('Failed to delete image from storage, but continuing with database update');
        }

        // Update the user's profile to remove the image URL
        const updatedUser = await ctx.db.user.update({
          where: { id: input.userId },
          data: {
            image: null,
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
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        
        console.error('Error deleting profile photo:', error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to delete profile photo" 
        });
      }
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

      // Publish user deleted event
      await ctx.outbox.publishUserEvent(
        OutboxEvents.USER_DELETED,
        input.id,
        null, // No tenant context for platform admin actions
        {
          userId: input.id,
          email: user.email!,
          name: user.name || "",
          action: "user_deleted",
          metadata: {
            deletedBy: ctx.session.user.id,
            deletedByEmail: ctx.session.user.email,
            timestamp: new Date().toISOString(),
          },
        }
      );

      return { success: true };
    }),
});
