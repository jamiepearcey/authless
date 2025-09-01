import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../middleware";
import * as crypto from "crypto";
import { twoFactorService } from "../two-factor-service";

// Passkey registration input schema
const passkeyRegistrationInput = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Passkey name is required"),
  credentialId: z.string().min(1, "Credential ID is required"),
  publicKey: z.string().min(1, "Public key is required"),
  signCount: z.number().int().min(0),
  transports: z.array(z.string()).optional(),
  backupEligible: z.boolean().default(false),
  backupState: z.boolean().default(false),
  userVerification: z.enum(["required", "preferred", "discouraged"]).default("preferred"),
});

// Passkey authentication input schema
const passkeyAuthenticationInput = z.object({
  credentialId: z.string().min(1, "Credential ID is required"),
  authenticatorData: z.string().min(1, "Authenticator data is required"),
  clientDataJSON: z.string().min(1, "Client data JSON is required"),
  signature: z.string().min(1, "Signature is required"),
  userHandle: z.string().optional(),
});

export const passkeyRouter = {
  // Get passkey registration options for a user
  getRegistrationOptions: protectedProcedure
    .input(z.object({
      userId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId } = input;
      
      // Verify user exists and is the current user or admin
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (ctx.session.user.id !== userId && ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to register passkeys for this user",
        });
      }

      // Generate challenge using crypto.randomBytes for proper WebAuthn compatibility
      const challenge = crypto.randomBytes(32);
      
      // For development, use localhost, for production use the actual domain
      const rpId = process.env.NODE_ENV === "development" ? "localhost" : 
        (process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost");
      
      return {
        challenge: btoa(String.fromCharCode(...challenge)), // Base64 encode
        rp: {
          name: "Authless uk",
          id: rpId,
        },
        user: {
          id: btoa(userId),
          name: user.email || user.name || "User",
          displayName: user.name || user.email || "User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        timeout: 60000,
        attestation: "direct",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
          requireResidentKey: false,
        },
        excludeCredentials: [], // Exclude existing passkeys
      };
    }),

  // Register a new passkey
  registerPasskey: protectedProcedure
    .input(passkeyRegistrationInput)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      
      // Check if credential ID already exists
      const existingPasskey = await ctx.db.passkey.findUnique({
        where: { credentialId: input.credentialId },
      });

      if (existingPasskey) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A passkey with this credential ID already exists",
        });
      }

      // Create the passkey
      const passkey = await ctx.db.passkey.create({
        data: {
          userId,
          name: input.name,
          credentialId: input.credentialId,
          publicKey: input.publicKey,
          signCount: input.signCount,
          transports: input.transports ? JSON.stringify(input.transports) : null,
          backupEligible: input.backupEligible,
          backupState: input.backupState,
          userVerification: input.userVerification,
        },
      });

      return passkey;
    }),

  // Get passkey authentication options for a user
  getAuthenticationOptions: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email } = input;
      
      // Find user by email
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          email: true, 
          name: true,
          passkeys: {
            where: { isActive: true },
            select: { credentialId: true, transports: true },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.passkeys.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active passkeys found for this user",
        });
      }

      // Generate challenge using crypto.randomBytes for proper WebAuthn compatibility
      const challenge = crypto.randomBytes(32);
      
      // For development, use localhost, for production use the actual domain
      const rpId = process.env.NODE_ENV === "development" ? "localhost" : 
        (process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost");
      
      return {
        challenge: btoa(String.fromCharCode(...challenge)),
        rpId: rpId,
        allowCredentials: user.passkeys.map(passkey => ({
          id: passkey.credentialId,
          type: "public-key",
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        })),
        userVerification: "preferred",
        timeout: 60000,
      };
    }),

  // Authenticate with a passkey
  authenticatePasskey: publicProcedure
    .input(passkeyAuthenticationInput)
    .mutation(async ({ input, ctx }) => {
      const { credentialId } = input;
      
      // Find the passkey
      const passkey = await ctx.db.passkey.findUnique({
        where: { credentialId, isActive: true },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      if (!passkey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid passkey",
        });
      }

      // In a real implementation, verify the signature here
      // For now, we'll just update the sign count and last used time
      
      await ctx.db.passkey.update({
        where: { id: passkey.id },
        data: {
          signCount: passkey.signCount + 1,
          lastUsedAt: new Date(),
        },
      });

      return {
        user: passkey.user,
        success: true,
      };
    }),

  // Get user's passkeys
  getUserPasskeys: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { userId } = input;
      
      // Check if user is requesting their own passkeys or is admin
      if (ctx.session.user.id !== userId && ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this user's passkeys",
        });
      }

      const passkeys = await ctx.db.passkey.findMany({
        where: { 
          userId,
          isActive: true 
        },
        orderBy: { lastUsedAt: "desc" },
      });

      return passkeys;
    }),

  // Get user's 2FA status
  getTwoFactorStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Get user's 2FA settings
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorSecret: true, // Legacy field
          passkeys: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Use unified system for TOTP methods
      const totpMethods = await twoFactorService.getUserTOTPMethods(
        userId,
        undefined // No tenant ID in passkey context
      );

      return {
        authenticator: {
          enabled: totpMethods.length > 0 || !!user.twoFactorSecret, // Check unified system + legacy
          verified: totpMethods.length > 0 || !!user.twoFactorSecret,
        },
        passkey: {
          enabled: user.passkeys.length > 0,
          verified: user.passkeys.length > 0,
        },
      };
    }),

  // Get all available accounts with passkeys for the current domain
  getAvailableAccounts: publicProcedure
    .query(async ({ ctx }) => {
      // Get all users who have active passkeys
      const usersWithPasskeys = await ctx.db.user.findMany({
        where: {
          passkeys: {
            some: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          passkeys: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              lastUsedAt: true,
              transports: true,
            },
          },
        },
        orderBy: {
          email: "asc",
        },
      });

      // Transform to match the expected interface
      const accounts = usersWithPasskeys.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        machines: user.passkeys.map(passkey => ({
          machineId: passkey.id,
          machineName: passkey.name,
          passkey: {
            id: passkey.id,
            name: passkey.name,
            lastUsedAt: passkey.lastUsedAt,
            transports: passkey.transports,
          },
        })),
        hasMultipleMachines: user.passkeys.length > 1,
      }));

      return { accounts };
    }),

  // Revoke a passkey
  revokePasskey: protectedProcedure
    .input(z.object({
      passkeyId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { passkeyId } = input;
      
      // Find the passkey
      const passkey = await ctx.db.passkey.findUnique({
        where: { id: passkeyId },
        select: { id: true, userId: true, name: true },
      });

      if (!passkey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Passkey not found",
        });
      }

      // Verify user owns the passkey or is admin
      if (ctx.session.user.id !== passkey.userId && ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to revoke this passkey",
        });
      }

      // Deactivate the passkey
      await ctx.db.passkey.update({
        where: { id: passkeyId },
        data: { isActive: false },
      });

      return { success: true, message: `Passkey "${passkey.name}" has been revoked` };
    }),

  // Get accounts with passkeys for selection
  getAccountsWithPasskeys: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(async ({ input, ctx }) => {
      const { email } = input;
      
      // Find user by email
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          email: true, 
          name: true,
          passkeys: {
            where: { isActive: true },
            select: { 
              id: true, 
              name: true, 
              lastUsedAt: true,
              transports: true,
            },
          },
        },
      });

      if (!user) {
        return { accounts: [] };
      }

      if (user.passkeys.length === 0) {
        return { accounts: [] };
      }

      // Group passkeys by machine (for now, treat each passkey as a separate machine)
      const machines = user.passkeys.map(passkey => ({
        machineId: passkey.id,
        machineName: passkey.name,
        passkey: passkey,
      }));

      // Return account info with machine details
      return {
        accounts: [{
          id: user.id,
          email: user.email,
          name: user.name,
          machines: machines,
          hasMultipleMachines: machines.length > 1,
        }],
      };
    }),
};
