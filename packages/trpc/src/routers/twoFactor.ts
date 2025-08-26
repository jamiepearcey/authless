import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../base";
import { randomBytes } from "crypto";
import base32Encode from "base32-encode";
import { authenticator } from "otplib";

export const twoFactorRouter = router({
  // Generate new authenticator code (creates temporary secret, doesn't save to DB yet)
  generateAuthenticatorCode: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1).max(50) // User-friendly name for the code
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Generate a new secret (temporary, not saved yet)
        const secret = authenticator.generateSecret(32);

        // Generate QR code URL for authenticator apps
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(ctx.session.user.email || "user")}?secret=${secret}&issuer=${encodeURIComponent("Beat The Fine London")}`;
        
        return {
          secret: secret,
          qrCodeUrl,
          name: input.name,
          message: "New authenticator code generated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to generate authenticator code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate authenticator code",
        });
      }
    }),

  // Verify and create authenticator code (final step)
  verifyAndCreateAuthenticatorCode: protectedProcedure
    .input(z.object({ 
      code: z.string().length(6),
      name: z.string().min(1).max(50),
      secret: z.string() // The secret that was generated in the previous step
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Verify the code against the temporary secret
        const isValid = await authenticator.verify({
          token: input.code,
          secret: input.secret,
        });

        if (!isValid) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Invalid verification code" 
          });
        }

        // Create the authenticator code in the database
        const authenticatorCode = await ctx.db.authenticatorCode.create({
          data: {
            userId: ctx.session.user.id,
            name: input.name,
            secret: input.secret,
            isActive: true,
          },
        });

        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "authenticator_code_created",
            resourceType: "user",
            resourceId: ctx.session.user.id || "unknown",
            details: JSON.stringify({ 
              email: ctx.session.user.email,
              authenticatorCodeId: authenticatorCode.id,
              name: input.name 
            }),
            severity: "info",
          },
        });

        return { 
          success: true, 
          message: "Authenticator code created successfully",
          authenticatorCode 
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to verify and create authenticator code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify and create authenticator code",
        });
      }
    }),

  // Get user's authenticator codes
  getAuthenticatorCodes: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const codes = await ctx.db.authenticatorCode.findMany({
        where: { 
          userId: ctx.session.user.id,
          isActive: true 
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          secret: true,
          lastUsedAt: true,
          createdAt: true,
        },
      });

      // Mask the secrets to only show first few characters
      const maskedCodes = codes.map(code => ({
        ...code,
        secret: code.secret.substring(0, 8) + "...", // Show only first 8 characters
        fullSecret: code.secret, // Include full secret for verification
      }));

      return maskedCodes;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Failed to get authenticator codes:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get authenticator codes",
      });
    }
  }),

  // Delete authenticator code
  deleteAuthenticatorCode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Verify the code belongs to the user
        const code = await ctx.db.authenticatorCode.findFirst({
          where: { 
            id: input.id,
            userId: ctx.session.user.id,
            isActive: true 
          },
        });

        if (!code) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Authenticator code not found" 
          });
        }

        // Soft delete by setting isActive to false
        await ctx.db.authenticatorCode.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true, message: "Authenticator code deleted successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to delete authenticator code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete authenticator code",
        });
      }
    }),

  // Verify authenticator code (for login)
  verifyAuthenticatorCode: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Get all active authenticator codes for the user
        const codes = await ctx.db.authenticatorCode.findMany({
          where: { 
            userId: ctx.session.user.id,
            isActive: true 
          },
          select: { id: true, secret: true },
        });

        if (codes.length === 0) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "No authenticator codes found for this user" 
          });
        }

        // Try to verify the code against any of the user's codes
        let verifiedCode = null;
        for (const code of codes) {
          const isValid = await authenticator.verify({
            token: input.code,
            secret: code.secret,
          });
          
          if (isValid) {
            verifiedCode = code;
            break;
          }
        }

        if (!verifiedCode) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Invalid authenticator code" 
          });
        }

        // Update last used time
        await ctx.db.authenticatorCode.update({
          where: { id: verifiedCode.id },
          data: { lastUsedAt: new Date() },
        });

        return { success: true, message: "Authenticator code verified successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to verify authenticator code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify authenticator code",
        });
      }
    }),

  // Get 2FA status for the user
  getTwoFactorStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          passkeys: {
            where: { isActive: true },
            select: { id: true }
          },
          authenticatorCodes: {
            where: { isActive: true },
            select: { id: true }
          }
        }
      });

      return {
        hasPasskeys: (user?.passkeys?.length || 0) > 0,
        hasAuthenticatorCodes: (user?.authenticatorCodes?.length || 0) > 0,
        passkeyCount: user?.passkeys?.length || 0,
        authenticatorCodeCount: user?.authenticatorCodes?.length || 0,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Failed to get 2FA status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get 2FA status",
      });
    }
  }),
});
