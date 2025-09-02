import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../middleware";
import { db } from "@db/base";
import { TRPCError } from "@trpc/server";
import { twoFactorService } from "../two-factor-service";
import { verifyPassword } from "@shared/base";
import { randomBytes } from "crypto";
import { getTrpcOutboxService, OutboxEvents } from "../outbox-service";

export const authRouter = router({
  /**
   * Start password login - handles 2FA detection and pending auth creation
   */
  startPasswordLogin: publicProcedure
    .input(z.object({
      identifier: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const { identifier, password } = input;

      // Find user by email
      const user = await db.user.findUnique({
        where: { email: identifier },
        include: {
          twoFactorMethods: {
            where: {
              isEnabled: true,
              isVerified: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please verify your email before signing in",
        });
      }

      // Verify password
      if (!user.hashedPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValid = await verifyPassword(password, user.hashedPassword);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Check if user has 2FA enabled
      const enabledFactors = user.twoFactorMethods.map(method => method.type);
      
      if (enabledFactors.length === 0) {
        // No 2FA - proceed with direct login
        // This would be handled by NextAuth in the actual login flow
        return { next: "done" };
      }

      // Create pending auth state
      const tenantId = ctx.session?.user?.tenantId || null;
      const pendingAuth = await twoFactorService.createPendingAuth(
        user.id,
        tenantId,
        enabledFactors
      );

      // Log the auth attempt
      await twoFactorService["auditLog"](user.id, tenantId, "login_initiated", "password", true, `requires2fa: true`);

      // Publish login initiated event
      const outboxService = getTrpcOutboxService(db);
      await outboxService.publishUserEvent(
        OutboxEvents.AUTH_LOGIN_INITIATED,
        user.id,
        tenantId || null,
        {
          userId: user.id,
          email: user.email!,
          name: user.name || "",
          action: "login_initiated",
          metadata: {
            requires2fa: true,
            availableFactors: enabledFactors,
            timestamp: new Date().toISOString(),
          },
        }
      );

      return {
        next: "2fa",
        nonce: pendingAuth.nonce,
        availableFactors: enabledFactors,
      };
    }),

  /**
   * Send 2FA verification code
   */
  send2faCode: publicProcedure
    .input(z.object({
      method: z.enum(["whatsapp", "sms", "email"]),
      nonce: z.string().optional(), // For login flow
    }))
    .mutation(async ({ input, ctx }) => {
      const { method, nonce } = input;

      let userId: string;
      let tenantId: string | null = null;

      if (nonce) {
        // Login flow - get user from pending auth
        const pendingAuth = await twoFactorService.getPendingAuth(nonce);
        if (!pendingAuth) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired authentication session",
          });
        }
        userId = pendingAuth.userId;
        tenantId = pendingAuth.tenantId || null;
      } else {
        // Settings flow - user must be authenticated
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }
        userId = ctx.session.user.id;
        tenantId = ctx.session.user.tenantId || null;
      }

      // Verify user has this method enabled
      const factorMethod = await db.twoFactorMethod.findFirst({
        where: {
          userId,
          type: method,
          isEnabled: true,
          isVerified: true,
        },
      });

      if (!factorMethod) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${method} 2FA is not enabled for this account`,
        });
      }

      // Generate and send code
      const { traceId, code } = await twoFactorService.createVerificationCode(
        userId,
        tenantId,
        method,
        "login_2fa"
      );

      if (method === "whatsapp" && factorMethod.identifier) {
        await twoFactorService.sendWhatsAppCode({
          userId,
          tenantId: tenantId || undefined,
          phoneE164: factorMethod.identifier,
          code: code, // This will be filled by the service
          ttlSeconds: parseInt(process.env.TWO_FA_CODE_TTL_SECONDS || "300"),
          traceId,
          purpose: "login_2fa",
        });
      }

      await twoFactorService.auditLog(userId, tenantId, "send", method, true, `traceId: ${traceId}`);

      return { ok: true, traceId };
    }),

  /**
   * Verify 2FA code and complete authentication
   */
  verify2faCode: publicProcedure
    .input(z.object({
      method: z.enum(["whatsapp", "sms", "email", "totp"]),
      code: z.string().length(6, "Code must be 6 digits"),
      nonce: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { method, code, nonce } = input;

      // Get pending auth
      const pendingAuth = await twoFactorService.getPendingAuth(nonce);
      if (!pendingAuth) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired authentication session",
        });
      }

      // Verify the method is in required factors
      if (!pendingAuth.requiredFactors.includes(method)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid authentication method for this session",
        });
      }

      let verificationResult: { success: boolean; locked?: boolean };

      if (method === "totp") {
        // Handle TOTP verification using the unified system
        verificationResult = await twoFactorService.verifyTOTPCode(
          pendingAuth.userId,
          pendingAuth.tenantId || null,
          code
        );
      } else {
        // Handle code-based verification (WhatsApp, SMS, Email)
        verificationResult = await twoFactorService.verifyVerificationCode(
          pendingAuth.userId,
          method as "whatsapp" | "sms" | "email",
          "login_2fa",
          code
        );
      }

      if (verificationResult.locked) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Account temporarily locked due to too many failed attempts",
        });
      }

      if (!verificationResult.success) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired verification code",
        });
      }

      // Clear pending auth
      await twoFactorService.clearPendingAuth(nonce);

      // Update last used timestamp for the factor
      await db.twoFactorMethod.updateMany({
        where: {
          userId: pendingAuth.userId,
          type: method,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      await twoFactorService["auditLog"](
        pendingAuth.userId,
        pendingAuth.tenantId || null,
        "verify",
        method,
        true,
        "Login 2FA successful"
      );

      // Get user details for session creation
      const user = await db.user.findUnique({
        where: { id: pendingAuth.userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          platformRole: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Create a secure session token for completing authentication
      const sessionToken = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store the session token in the database
      await db.session.create({
        data: {
          sessionToken,
          userId: user.id,
          tenantId: pendingAuth.tenantId,
          expires: expiresAt,
        },
      });

      // Publish login completed event
      const outboxService = getTrpcOutboxService(db);
      await outboxService.publishUserEvent(
        OutboxEvents.AUTH_LOGIN_COMPLETED,
        user.id,
        pendingAuth.tenantId,
        {
          userId: user.id,
          email: user.email!,
          name: user.name || "",
          action: "login_completed",
          metadata: {
            method: method,
            timestamp: new Date().toISOString(),
          },
        }
      );

      // Return session token for secure authentication completion
      return { 
        success: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
          platformRole: user.platformRole || undefined,
          tenantId: pendingAuth.tenantId || undefined,
        },
      };
    }),

  /**
   * Complete authentication with session token (called after 2FA verification)
   */
  completeAuthentication: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sessionToken } = input;

      // Find and validate the session token
      const session = await db.session.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              platformRole: true,
            },
          },
        },
      });

      if (!session || session.expires < new Date()) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired session token",
        });
      }

      // Delete the temporary session token
      await db.session.delete({
        where: { sessionToken },
      });

      // Return user data for NextAuth session creation
      return {
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name,
          image: session.user.image,
          platformRole: session.user.platformRole || undefined,
          tenantId: session.tenantId || undefined,
        },
      };
    }),

  /**
   * Get current pending auth status
   */
  getPendingAuthStatus: publicProcedure
    .input(z.object({
      nonce: z.string(),
    }))
    .query(async ({ input }) => {
      const { nonce } = input;

      const pendingAuth = await twoFactorService.getPendingAuth(nonce);
      if (!pendingAuth) {
        return null;
      }

      return {
        userId: pendingAuth.userId,
        requiredFactors: pendingAuth.requiredFactors,
        expiresAt: pendingAuth.expiresAt,
      };
    }),

  /**
   * Cancel pending authentication
   */
  cancelPendingAuth: publicProcedure
    .input(z.object({
      nonce: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { nonce } = input;

      await twoFactorService.clearPendingAuth(nonce);

      return { ok: true };
    }),
});
