import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../base";
import { randomBytes } from "crypto";
import base32Encode from "base32-encode";
import { authenticator } from "otplib";

export const twoFactorRouter = router({
  // Setup 2FA (protected)
  setupTwoFactor: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      if (!ctx.session?.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    
      // Generate 20 random bytes
      const buf = randomBytes(20);

      // Encode to Base32 (RFC4648 without padding)
      const secret = base32Encode(buf, "RFC4648", { padding: false });

      // Generate QR code URL for authenticator apps
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(ctx.session.user.email)}?secret=${secret}&issuer=${encodeURIComponent("Authless")}`;
      
      // TODO: Generate actual QR code image
      // For now, return the URL that can be used with a QR code generator
      
      // Store the secret temporarily (in production, this would be encrypted)
      // For now, we'll store it in the user record
      await ctx.db.user.update({
        where: { email: ctx.session.user.email },
        data: {
          twoFactorSecret: secret,
          twoFactorEnabled: false, // Will be enabled after verification
        },
      });
      
      return {
        secret,
        qrCodeUrl,
        message: "Scan the QR code with your authenticator app, then verify the code to enable 2FA",
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Failed to setup 2FA:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to setup 2FA",
      });
    }
  }),

  // Verify 2FA setup (protected)
  verifyTwoFactor: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.email) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        
        // Get user's 2FA secret
        const user = await ctx.db.user.findUnique({
          where: { email: ctx.session.user.email },
          select: { twoFactorSecret: true },
        });
        
        if (!user?.twoFactorSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not set up" });
        }
        
        const isValid = await authenticator.verify({
          token: input.code,
          secret: user.twoFactorSecret,
        });
        
        if (!isValid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA code" });
        }
        
        // Enable 2FA for the user
        await ctx.db.user.update({
          where: { email: ctx.session.user.email },
          data: {
            twoFactorEnabled: true,
          },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "2fa_enabled",
            resourceType: "user",
            resourceId: ctx.session.user.id || "unknown",
            details: JSON.stringify({ email: ctx.session.user.email }),
            severity: "info",
          },
        });
        
        return { success: true, message: "2FA enabled successfully" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to verify 2FA:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify 2FA",
        });
      }
    }),

  // Verify 2FA code for post-login (protected)
  verifyTwoFactorCode: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.email) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        
        // Get user's 2FA secret
        const user = await ctx.db.user.findUnique({
          where: { email: ctx.session.user.email },
          select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        
        if (!user?.twoFactorEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA not enabled for this user" });
        }
        
        if (!user?.twoFactorSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA secret not found" });
        }
        
        const isValid = await authenticator.verify({
          token: input.code,
          secret: user.twoFactorSecret,
        });
        
        if (!isValid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid 2FA code" });
        }
        
        // Log successful 2FA verification
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "2fa_verified",
            resourceType: "user",
            resourceId: ctx.session.user.id || "unknown",
            details: JSON.stringify({ email: ctx.session.user.email }),
            severity: "info",
          },
        });
        
        return { success: true, message: "2FA verification successful" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to verify 2FA code:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify 2FA code",
        });
      }
    }),
});
