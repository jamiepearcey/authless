import { db } from "@db/base";
import { createHash, randomBytes, createHmac } from "crypto";
import { TRPCError } from "@trpc/server";
import { authenticator } from "otplib";

export interface TwoFactorCodeData {
  code: string;
  hash: string;
  salt: string;
}

export interface PendingAuthData {
  id: string;
  userId: string;
  tenantId?: string;
  nonce: string;
  requiredFactors: string[];
  expiresAt: Date;
}

export interface WhatsAppWebhookPayload {
  userId: string;
  tenantId?: string;
  phoneE164: string;
  code: string;
  ttlSeconds: number;
  traceId: string;
  purpose: "login_2fa" | "factor_activation";
}

export class TwoFactorService {
  private readonly codeLength = 6;
  private readonly defaultTTL = parseInt(process.env.TWO_FA_CODE_TTL_SECONDS || "300");
  private readonly maxAttempts = parseInt(process.env.TWO_FA_MAX_ATTEMPTS || "5");

  /**
   * Generate a secure verification code and its hash
   */
  generateCode(): TwoFactorCodeData {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = randomBytes(32).toString("hex");
    const hash = this.hashCode(code, salt);
    
    return { code, hash, salt };
  }

  /**
   * Hash a code with salt
   */
  private hashCode(code: string, salt: string): string {
    return createHash("sha256").update(code + salt).digest("hex");
  }

  /**
   * Verify a code against its hash
   */
  verifyCode(code: string, hash: string, salt: string): boolean {
    const computedHash = this.hashCode(code, salt);
    return computedHash === hash;
  }

  /**
   * Create pending authentication state
   */
  async createPendingAuth(
    userId: string,
    tenantId: string | null,
    requiredFactors: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<PendingAuthData> {
    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const pendingAuth = await db.pendingAuth.create({
      data: {
        userId,
        tenantId,
        nonce,
        requiredFactors: JSON.stringify(requiredFactors),
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      id: pendingAuth.id,
      userId: pendingAuth.userId,
      tenantId: pendingAuth.tenantId || undefined,
      nonce: pendingAuth.nonce,
      requiredFactors: JSON.parse(pendingAuth.requiredFactors),
      expiresAt: pendingAuth.expiresAt,
    };
  }

  /**
   * Get pending auth by nonce
   */
  async getPendingAuth(nonce: string): Promise<PendingAuthData | null> {
    const pendingAuth = await db.pendingAuth.findUnique({
      where: { nonce },
    });

    if (!pendingAuth || pendingAuth.expiresAt < new Date()) {
      if (pendingAuth) {
        // Clean up expired auth
        await db.pendingAuth.delete({ where: { id: pendingAuth.id } });
      }
      return null;
    }

    // make pending auth array distinct
    const requiredFactors = JSON.parse(pendingAuth.requiredFactors);
    const distinctRequiredFactors : string[] = [...new Set<string>(requiredFactors)];
    
    return {
      id: pendingAuth.id,
      userId: pendingAuth.userId,
      tenantId: pendingAuth.tenantId || undefined,
      nonce: pendingAuth.nonce,
      requiredFactors: distinctRequiredFactors,
      expiresAt: pendingAuth.expiresAt,
    };
  }

  /**
   * Clear pending auth
   */
  async clearPendingAuth(nonce: string): Promise<void> {
    await db.pendingAuth.deleteMany({ where: { nonce } });
  }

  /**
   * Create 2FA verification code
   */
  async createVerificationCode(
    userId: string,
    tenantId: string | null,
    type: "whatsapp" | "sms" | "email",
    purpose: "login_2fa" | "factor_activation",
    traceId?: string
  ): Promise<{ code: string; traceId: string }> {
    // Check rate limiting - max 3 codes per user per 10 minutes
    const recentCodes = await db.twoFactorCode.count({
      where: {
        userId,
        type,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
    });

    if (recentCodes >= 20) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many verification codes requested. Please wait before requesting another.",
      });
    }

    // Invalidate existing codes for this user/type/purpose
    await db.twoFactorCode.updateMany({
      where: {
        userId,
        type,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const { code, hash, salt } = this.generateCode();
    const generatedTraceId = traceId || randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + this.defaultTTL * 1000);

    await db.twoFactorCode.create({
      data: {
        userId,
        tenantId,
        type,
        codeHash: hash,
        salt,
        purpose,
        expiresAt,
        traceId: generatedTraceId,
        maxAttempts: this.maxAttempts,
      },
    });

    return { code, traceId: generatedTraceId };
  }

  /**
   * Verify 2FA code
   */
  async verifyVerificationCode(
    userId: string,
    type: "whatsapp" | "sms" | "email",
    purpose: "login_2fa" | "factor_activation",
    code: string
  ): Promise<{ success: boolean; locked?: boolean }> {
    const storedCode = await db.twoFactorCode.findFirst({
      where: {
        userId,
        type,
        purpose,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!storedCode) {
      await this.auditLog(userId, null, "verify", type, false, "Code not found or expired");
      return { success: false };
    }

    // Check if locked due to too many attempts
    if (storedCode.attempts >= storedCode.maxAttempts) {
      await this.auditLog(userId, null, "fail", type, false, "Account locked due to too many attempts");
      return { success: false, locked: true };
    }

    // Increment attempt count
    await db.twoFactorCode.update({
      where: { id: storedCode.id },
      data: { attempts: storedCode.attempts + 1 },
    });

    const isValid = this.verifyCode(code, storedCode.codeHash, storedCode.salt);

    if (isValid) {
      // Mark as used
      await db.twoFactorCode.update({
        where: { id: storedCode.id },
        data: { usedAt: new Date() },
      });

      await this.auditLog(userId, null, "verify", type, true);
      return { success: true };
    } else {
      await this.auditLog(userId, null, "fail", type, false, "Invalid code");
      
      // Check if this was the last attempt
      const locked = storedCode.attempts + 1 >= storedCode.maxAttempts;
      if (locked) {
        await this.auditLog(userId, null, "lockout", type, false, "Account locked due to failed attempts");
      }
      
      return { success: false, locked };
    }
  }

  /**
   * Get user's enabled 2FA methods
   */
  async getUserTwoFactorMethods(userId: string, tenantId?: string): Promise<any[]> {
    return await db.twoFactorMethod.findMany({
      where: {
        userId,
        tenantId: tenantId || null,
        isEnabled: true,
        isVerified: true,
      },
      select: {
        type: true,
        identifier: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Enable WhatsApp 2FA for user
   */
  async enableWhatsApp2FA(
    userId: string,
    tenantId: string | null,
    phoneE164: string
  ): Promise<{ traceId: string }> {
    // Create or update the 2FA method (not enabled until verified)
    const existingMethod = await db.twoFactorMethod.findFirst({
      where: {
        userId,
        type: "whatsapp",
        tenantId: tenantId,
      },
    });

    if (existingMethod) {
      await db.twoFactorMethod.update({
        where: { id: existingMethod.id },
        data: {
          identifier: phoneE164,
          isEnabled: false,
          isVerified: false,
        },
      });
    } else {
      await db.twoFactorMethod.create({
        data: {
          userId,
          tenantId,
          type: "whatsapp",
          identifier: phoneE164,
          isEnabled: false,
          isVerified: false,
        },
      });
    }

    // Generate activation code
    const { code, traceId } = await this.createVerificationCode(
      userId,
      tenantId,
      "whatsapp",
      "factor_activation"
    );

    // Send via webhook
    await this.sendWhatsAppCode({
      userId,
      tenantId: tenantId || undefined,
      phoneE164,
      code,
      ttlSeconds: this.defaultTTL,
      traceId,
      purpose: "factor_activation",
    });

    await this.auditLog(userId, tenantId, "send", "whatsapp", true, "Activation code sent");

    return { traceId };
  }

  /**
   * Verify WhatsApp activation code
   */
  async verifyWhatsAppActivation(userId: string, code: string): Promise<boolean> {
    const result = await this.verifyVerificationCode(userId, "whatsapp", "factor_activation", code);
    
    if (result.success) {
      // Enable the method
      await db.twoFactorMethod.updateMany({
        where: {
          userId,
          type: "whatsapp",
        },
        data: {
          isEnabled: true,
          isVerified: true,
        },
      });

      await this.auditLog(userId, null, "enable", "whatsapp", true);
      return true;
    }

    return false;
  }

  /**
   * Disable WhatsApp 2FA
   */
  async disableWhatsApp2FA(userId: string, tenantId?: string): Promise<void> {
    await db.twoFactorMethod.updateMany({
      where: {
        userId,
        type: "whatsapp",
        tenantId: tenantId || null,
      },
      data: {
        isEnabled: false,
      },
    });

    await this.auditLog(userId, tenantId || null, "disable", "whatsapp", true);
  }

  /**
   * Send WhatsApp code via webhook
   */
  public async sendWhatsAppCode(payload: WhatsAppWebhookPayload): Promise<void> {
    const webhookUrl = process.env.WHATSAPP_2FA_WEBHOOK_URL;
    console.log("payload", payload, webhookUrl);
    if (!webhookUrl) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "WhatsApp webhook not configured",
      });
    }

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add HMAC signature if secret is configured
    const secret = process.env.WHATSAPP_2FA_WEBHOOK_SECRET;
    console.log("secret", secret);
    console.log("body", body);  
    console.log("webhookUrl", webhookUrl);
    if (secret) {
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      headers["X-Signature"] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log(`[2FA WhatsApp] Code sent successfully to ${payload.phoneE164} (trace: ${payload.traceId})`);
    } catch (error) {
      console.error(`[2FA WhatsApp] Failed to send code (trace: ${payload.traceId}):`, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send verification code",
      });
    }
  }

  /**
   * Create audit log entry
   */
  public async auditLog(
    userId: string,
    tenantId: string | null,
    action: string,
    factorType: string,
    success: boolean,
    metadata?: string
  ): Promise<void> {
    try {
      await db.twoFactorAudit.create({
        data: {
          userId,
          tenantId,
          action,
          factorType,
          success,
          metadata,
        },
      });
    } catch (error) {
      console.error("[2FA Audit] Failed to log audit entry:", error);
    }
  }

  /**
   * Enable TOTP 2FA for user
   */
  async enableTOTP2FA(
    userId: string,
    tenantId: string | null,
    name: string,
    secret: string
  ): Promise<void> {
    // Find existing TOTP method or create new one
    const existingMethod = await db.twoFactorMethod.findFirst({
      where: {
        userId,
        type: "totp",
        tenantId: tenantId,
        identifier: name,
      },
    });

    if (existingMethod) {
      await db.twoFactorMethod.update({
        where: { id: existingMethod.id },
        data: {
          secret: secret,
          isEnabled: true,
          isVerified: true,
        },
      });
    } else {
      await db.twoFactorMethod.create({
        data: {
          userId,
          tenantId,
          type: "totp",
          identifier: name,
          secret: secret,
          isEnabled: true,
          isVerified: true,
        },
      });
    }

    await this.auditLog(userId, tenantId, "enable", "totp", true, `TOTP enabled: ${name}`);
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTPCode(
    userId: string,
    tenantId: string | null,
    code: string
  ): Promise<{ success: boolean; locked?: boolean }> {
    // Get user's TOTP methods
    const totpMethods = await db.twoFactorMethod.findMany({
      where: {
        userId,
        type: "totp",
        tenantId: tenantId,
        isEnabled: true,
        isVerified: true,
      },
    });

    if (totpMethods.length === 0) {
      await this.auditLog(userId, tenantId, "verify", "totp", false, "No TOTP methods configured");
      return { success: false };
    }

    // Check rate limiting for TOTP
    const recentAttempts = await db.twoFactorCode.count({
      where: {
        userId,
        type: "totp",
        purpose: "login_2fa",
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
    });

    if (recentAttempts >= this.maxAttempts) {
      await this.auditLog(userId, tenantId, "lockout", "totp", false, "Rate limit exceeded");
      return { success: false, locked: true };
    }

    // Create attempt record for rate limiting
    const attemptId = randomBytes(16).toString("hex");
    await db.twoFactorCode.create({
      data: {
        userId,
        tenantId,
        type: "totp",
        codeHash: "totp_attempt", // Placeholder since TOTP doesn't store codes
        salt: "totp",
        purpose: "login_2fa",
        expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute
        traceId: attemptId,
        attempts: 1,
        maxAttempts: this.maxAttempts,
      },
    });

    // Try to verify against any of the user's TOTP secrets
    let verified = false;
    let verifiedMethod = null;

    for (const method of totpMethods) {
      try {
        const isValid = authenticator.verify({
          token: code,
          secret: method.secret || ""
        });

        if (isValid) {
          verified = true;
          verifiedMethod = method;
          break;
        }
      } catch (error) {
        console.error(`TOTP verification error for method ${method.id}:`, error);
      }
    }

    if (verified && verifiedMethod) {
      // Update last used time
      await db.twoFactorMethod.update({
        where: { id: verifiedMethod.id },
        data: { lastUsedAt: new Date() },
      });

      // Mark attempt as used
      await db.twoFactorCode.updateMany({
        where: {
          traceId: attemptId,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await this.auditLog(userId, tenantId, "verify", "totp", true, `TOTP verified: ${verifiedMethod.identifier}`);
      return { success: true };
    } else {
      await this.auditLog(userId, tenantId, "fail", "totp", false, "Invalid TOTP code");
      return { success: false };
    }
  }

  /**
   * Disable TOTP 2FA method
   */
  async disableTOTP2FA(userId: string, tenantId: string | null, methodId: string): Promise<void> {
    await db.twoFactorMethod.update({
      where: {
        id: methodId,
        userId,
        type: "totp",
        tenantId: tenantId,
      },
      data: {
        isEnabled: false,
      },
    });

    await this.auditLog(userId, tenantId, "disable", "totp", true, `TOTP disabled: ${methodId}`);
  }

  /**
   * Get user's TOTP methods
   */
  async getUserTOTPMethods(userId: string, tenantId?: string): Promise<any[]> {
    return await db.twoFactorMethod.findMany({
      where: {
        userId,
        tenantId: tenantId || null,
        type: "totp",
        isEnabled: true,
        isVerified: true,
      },
      select: {
        id: true,
        identifier: true, // This is the name
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Migrate legacy AuthenticatorCode to TwoFactorMethod
   */
  async migrateLegacyAuthenticatorCodes(): Promise<void> {
    const legacyCodes = await db.authenticatorCode.findMany({
      where: { isActive: true },
    });

    for (const legacyCode of legacyCodes) {
      try {
        // Check if already migrated
        const existing = await db.twoFactorMethod.findFirst({
          where: {
            userId: legacyCode.userId,
            type: "totp",
            identifier: legacyCode.name,
          },
        });

        if (!existing) {
          await this.enableTOTP2FA(
            legacyCode.userId,
            null, // Legacy codes don't have tenantId
            legacyCode.name,
            legacyCode.secret
          );

          console.log(`Migrated legacy authenticator code: ${legacyCode.id} -> TOTP method`);
        }
      } catch (error) {
        console.error(`Failed to migrate legacy authenticator code ${legacyCode.id}:`, error);
      }
    }
  }

  /**
   * Clean up expired codes and pending auths
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    
    await Promise.all([
      db.twoFactorCode.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      db.pendingAuth.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);
  }
}

export const twoFactorService = new TwoFactorService();
