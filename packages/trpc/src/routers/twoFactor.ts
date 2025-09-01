import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware";
import { randomBytes } from "crypto";
import base32Encode from "base32-encode";
import { authenticator } from "otplib";
import { twoFactorService } from "../two-factor-service";

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
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(ctx.session.user.email || "user")}?secret=${secret}&issuer=${encodeURIComponent("Authless uk")}`;
        
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
        console.log("code and secret", input);  

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

        // Use the unified system only
        await twoFactorService.enableTOTP2FA(
          ctx.session.user.id,
          ctx.session.user.tenantId || null,
          input.name,
          input.secret
        );

        return { 
          success: true, 
          message: "Authenticator code created successfully"
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

      // Use the unified system only
      const totpMethods = await twoFactorService.getUserTOTPMethods(
        ctx.session.user.id,
        ctx.session.user.tenantId
      );

      // Convert to expected format for backward compatibility
      const codes = totpMethods.map(method => ({
        id: method.id,
        name: method.identifier,
        secret: "****", // Don't expose secrets
        fullSecret: "****", // Don't expose secrets
        lastUsedAt: method.lastUsedAt,
        createdAt: method.createdAt,
      }));

      return codes;
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

        // Use the unified system to disable the TOTP method
        await twoFactorService.disableTOTP2FA(
          ctx.session.user.id,
          ctx.session.user.tenantId || null,
          input.id
        );

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

        // Use the unified TOTP verification system only
        const result = await twoFactorService.verifyTOTPCode(
          ctx.session.user.id,
          ctx.session.user.tenantId || null,
          input.code
        );

        if (result.locked) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Account temporarily locked due to too many failed attempts",
          });
        }

        if (!result.success) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Invalid authenticator code" 
          });
        }

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
          }
        }
      });

      // Use unified system for TOTP methods
      const totpMethods = await twoFactorService.getUserTOTPMethods(
        ctx.session.user.id,
        ctx.session.user.tenantId
      );

      return {
        hasPasskeys: (user?.passkeys?.length || 0) > 0,
        hasAuthenticatorCodes: totpMethods.length > 0,
        passkeyCount: user?.passkeys?.length || 0,
        authenticatorCodeCount: totpMethods.length,
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

  // Get all enabled 2FA methods
  get2fa: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const methods = await twoFactorService.getUserTwoFactorMethods(
      ctx.session.user.id,
      ctx.session.user.tenantId
    );

    // Also get TOTP methods from the new unified system
    const totpMethods = await twoFactorService.getUserTOTPMethods(
      ctx.session.user.id,
      ctx.session.user.tenantId
    );

    // Convert TOTP methods to the expected format
    const formattedTotpMethods = totpMethods.map(method => ({
      type: "totp",
      identifier: method.identifier,
      lastUsedAt: method.lastUsedAt,
      createdAt: method.createdAt,
    }));

    // Combine all methods
    const allMethods = [...methods, ...formattedTotpMethods];

    // Mask phone numbers for security
    const maskedMethods = allMethods.map(method => ({
      ...method,
      identifier: method.type === "whatsapp" && method.identifier 
        ? maskPhoneNumber(method.identifier) 
        : method.identifier,
    }));

    return maskedMethods;
  }),

  // Enable WhatsApp 2FA
  enableWhatsapp2fa: protectedProcedure
    .input(z.object({
      phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const { traceId } = await twoFactorService.enableWhatsApp2FA(
        ctx.session.user.id,
        ctx.session.user.tenantId || null,
        input.phoneE164
      );

      return { 
        success: true, 
        message: "Verification code sent to your WhatsApp",
        traceId 
      };
    }),

  // Verify WhatsApp 2FA activation
  verifyWhatsappActivation: protectedProcedure
    .input(z.object({
      code: z.string().length(6, "Code must be 6 digits"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const success = await twoFactorService.verifyWhatsAppActivation(
        ctx.session.user.id,
        input.code
      );

      if (!success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code",
        });
      }

      return { 
        success: true, 
        message: "WhatsApp 2FA enabled successfully" 
      };
    }),

  // Disable WhatsApp 2FA
  disableWhatsapp2fa: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await twoFactorService.disableWhatsApp2FA(
        ctx.session.user.id,
        ctx.session.user.tenantId
      );

      return { 
        success: true, 
        message: "WhatsApp 2FA disabled successfully" 
      };
    }),

  // Send test 2FA code (for settings verification)
  sendTest2faCode: protectedProcedure
    .input(z.object({
      method: z.enum(["whatsapp", "sms", "email"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Use the auth router's send2faCode without nonce (settings flow)
      const { traceId } = await twoFactorService.createVerificationCode(
        ctx.session.user.id,
        ctx.session.user.tenantId || null,
        input.method,
        "login_2fa" // Reuse login_2fa purpose for settings testing
      );

      return { 
        success: true, 
        message: `Test verification code sent via ${input.method}`,
        traceId 
      };
    }),

  // Migrate legacy authenticator codes to unified system
  migrateLegacyAuthenticators: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Only platform admins can run migration
      if ((ctx.session.user as any)?.platformRole !== 'admin') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only platform administrators can run migrations",
        });
      }

      try {
        await twoFactorService.migrateLegacyAuthenticatorCodes();
        return {
          success: true,
          message: "Legacy authenticator codes migrated successfully",
        };
      } catch (error) {
        console.error("Migration failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to migrate legacy authenticator codes",
        });
      }
    }),

  // Legacy compatibility methods for existing UI components
  setupTwoFactor: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50).optional().default("My Authenticator")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Generate a new secret (temporary, not saved yet)
        const secret = authenticator.generateSecret(32);

        // Generate QR code URL for authenticator apps
        const qrCodeUrl = `otpauth://totp/${encodeURIComponent(ctx.session.user.email || "user")}?secret=${secret}&issuer=${encodeURIComponent("Authless uk")}`;
        
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

  verifyTwoFactor: protectedProcedure
    .input(z.object({
      code: z.string().length(6),
      secret: z.string(),
      name: z.string().min(1).max(50).optional().default("My Authenticator")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Verify the code against the secret
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

        // Use the unified system only
        await twoFactorService.enableTOTP2FA(
          ctx.session.user.id,
          ctx.session.user.tenantId || null,
          input.name,
          input.secret
        );

        return { 
          success: true, 
          message: "Authenticator code created successfully"
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
});

// Utility function to mask phone numbers
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return phone;
  const countryCode = phone.substring(0, phone.indexOf(' ') !== -1 ? phone.indexOf(' ') : 3);
  const lastFour = phone.slice(-4);
  const masked = '*'.repeat(phone.length - countryCode.length - 4);
  return `${countryCode}${masked}${lastFour}`;
}
