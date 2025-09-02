import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantAdminProcedure, protectedProcedure, publicProcedure } from "../middleware";
import { randomBytes } from "crypto";

export const invitationRouter = router({
  // Invite user to tenant (tenant admin only)
  inviteUser: tenantAdminProcedure
    .input(z.object({
      slug: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "member"]).default("member"),
      message: z.string().optional(),
      bypassEmailVerification: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { slug, email, role, message, bypassEmailVerification } = input;
        
        // Get tenant first
        const tenant = await ctx.db.tenant.findUnique({
          where: { slug },
        });
        
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        }
        
        // Check if user is already a member
        const existingUser = await ctx.db.user.findUnique({
          where: { email },
        });
        
        if (existingUser) {
          const existingMembership = await ctx.db.membership.findFirst({
            where: {
              userId: existingUser.id,
              tenantId: tenant.id,
              status: "active",
            },
          });
          
          if (existingMembership) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "User is already a member of this tenant",
            });
          }
        }
        
        // Check if invitation already exists
        const existingInvitation = await ctx.db.invitation.findFirst({
          where: {
            email,
            tenantId: tenant.id,
            status: "pending",
          },
        });
        
        if (existingInvitation) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User already has a pending invitation",
          });
        }
        
        // Generate invitation token
        const token = randomBytes(32).toString("hex");
        
        // Create invitation
        const invitation = await ctx.db.invitation.create({
          data: {
            tenantId: tenant.id,
            email,
            role,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            bypassEmailVerification,
            message,
            invitedByUserId: ctx.session.user.id || ctx.session.user.email,
          },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "user_invited",
            resourceType: "invitation",
            resourceId: invitation.id,
            traceId: ctx.trace.traceId,
            details: JSON.stringify({ email, role, tenantSlug: slug }),
            severity: "info",
          },
        });
        
        // TODO: Send invitation email
        // For now, return the token (in production, this would be sent via email)
        return {
          invitation,
          token: token, // This should be sent via email in production
          invitationCode: bypassEmailVerification ? token : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to invite user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite user",
        });
      }
    }),

  // Validate invitation (public - for users to check their invitation)
  validateInvitation: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { token } = input;
      
      const invitation = await ctx.db.invitation.findUnique({
        where: { token },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
            },
          },
        },
      });
      
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token" });
      }
      
      if (invitation.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is no longer valid" });
      }
      
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired" });
      }
      
      return {
        invitation,
        tenant: invitation.tenant,
      };
    }),

  // Accept invitation (public - for users to accept invitations)
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const { token, password } = input;
      
      const invitation = await ctx.db.invitation.findUnique({
        where: { token },
        include: {
          tenant: true,
        },
      });
      
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invitation token" });
      }
      
      if (invitation.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is no longer valid" });
      }
      
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired" });
      }
      
      // Check if user already exists
      let user = await ctx.db.user.findUnique({
        where: { email: invitation.email },
      });
      
      if (user) {
        // User exists, just create membership
        if (!user.hashedPassword) {
          // User exists but has no password, update it
          user = await ctx.db.user.update({
            where: { id: user.id },
            data: {
              hashedPassword: await ctx.hashPassword(input.password),
            },
          });
        }
      } else {
        // Create new user
        user = await ctx.db.user.create({
          data: {
            email: invitation.email,
            hashedPassword: await ctx.hashPassword(input.password),
            isEmailVerified: true, // Since they're using invitation code
          },
        });
      }
      
      // Create membership
      const membership = await ctx.db.membership.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          role: invitation.role,
          status: "active",
          invitationAcceptedAt: new Date(),
        },
      });
      
      // Mark invitation as accepted
      await ctx.db.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });
      
      // Log the action
      await ctx.db.auditLog.create({
        data: {
          userId: user.id,
          action: "invitation_accepted",
          resourceType: "invitation",
          resourceId: invitation.id,
          traceId: ctx.trace.traceId,
          details: JSON.stringify({ email: invitation.email, tenantId: invitation.tenantId }),
          severity: "info",
        },
      });
      
      return {
        user,
        membership,
        tenant: invitation.tenant,
      };
    }),

  // Update tenant user (tenant admin only)
  updateTenantUser: tenantAdminProcedure
    .input(z.object({
      slug: z.string(),
      userId: z.string(),
      name: z.string().optional(),
      role: z.enum(["admin", "member"]).optional(),
      status: z.enum(["active", "suspended", "removed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { slug, userId, name, role, status } = input;
      
      // Verify user has access to this tenant
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId,
          tenant: { slug },
          status: "active",
        },
      });
      
      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found in tenant" });
      }
      
      // Update membership
      const updatedMembership = await ctx.db.membership.update({
        where: { id: membership.id },
        data: {
          role,
          status,
        },
      });
      
      // Update user if name is provided
      if (name) {
        await ctx.db.user.update({
          where: { id: userId },
          data: { name },
        });
      }
      
      return updatedMembership;
    }),

  // Resend user verification (tenant admin only)
  resendUserVerification: tenantAdminProcedure
    .input(z.object({
      slug: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { slug, userId } = input;
      
      // Verify user has access to this tenant
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId,
          tenant: { slug },
          status: "active",
        },
      });
      
      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found in tenant" });
      }
      
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      
      // Generate new verification token
      const verificationToken = randomBytes(32).toString("hex");
      
      await ctx.db.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: verificationToken,
        },
      });
      
      // TODO: Implement actual email sending logic
      // For now, just return success
      return { success: true, message: "Verification email sent" };
    }),

  // Delete tenant user (tenant admin only)
  deleteTenantUser: tenantAdminProcedure
    .input(z.object({
      slug: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { slug, userId } = input;
      
      // Verify user has access to this tenant
      const membership = await ctx.db.membership.findFirst({
        where: {
          userId,
          tenant: { slug },
          status: "active",
        },
      });
      
      if (!membership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found in tenant" });
      }
      
      // Check if user is trying to remove themselves
      if (userId === ctx.session.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself from tenant" });
      }
      
      // Remove the user's membership from this tenant
      await ctx.db.membership.update({
        where: { id: membership.id },
        data: { status: "removed" },
      });
      
      // Log the action
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id || "unknown",
          action: "user_removed_from_tenant",
          resourceType: "membership",
          resourceId: membership.id,
          traceId: ctx.trace.traceId,
          details: JSON.stringify({ removedUserId: userId, tenantSlug: slug }),
          severity: "warning",
        },
      });
      
      return { success: true };
    }),
});
