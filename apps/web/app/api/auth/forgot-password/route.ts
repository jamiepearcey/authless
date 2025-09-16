import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";
import { generatePasswordResetToken } from "@shared/base";
import {
  constructPasswordResetUrl,
} from "@shared/base";
import { TrpcOutboxService, OutboxEvents } from "@trpc/base";
import { t } from "@i18n-core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    if (!email) {
      return NextResponse.json(
        {
          error: t(
            "Email is required",
            "auth.forgot-password.route.POST.email_is_required__tiifq6",
          ),
        },
        {
          status: 400,
        },
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        {
          message: t(
            "If an account with that email exists, a password reset link has been sent.",
            "auth.forgot-password.route.POST.if_an_account_with_that_email_exists_a_password_reset_link_has_been_sent__1sc7ws",
          ),
        },
        {
          status: 200,
        },
      );
    }

    // Get JWT secret from environment
    let jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Fallback for development - in production, this should always be set
      jwtSecret =
        "super-secret-jwt-key-for-development-only-change-in-production";
      console.warn(
        "JWT_SECRET not found in environment, using fallback secret",
      );
    }

    // Generate password reset token
    const resetToken = generatePasswordResetToken(
      user.id,
      user.email!,
      jwtSecret,
    );
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Create notification intent for password reset email
    try {
      const outboxService = new TrpcOutboxService(db);
      const callbackUrl = constructPasswordResetUrl(resetToken);
      
      await outboxService.publishNotificationIntentEvent(
        OutboxEvents.NOTIFICATION_INTENT_CREATED,
        `password-reset-${user.id}`,
        {
          id: `password-reset-${user.id}`,
          tenantId: null, // Password reset is not tenant-specific
          type: 'user.password_reset.requested',
          recipients: [user.id],
          payloadJson: {
            name: user.name || "User",
            email: user.email!,
            callbackUrl: callbackUrl,
            token: resetToken,
            userId: user.id
          },
          channels: ['email'],
          createdAt: new Date(),
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          traceId: user.id
        },
        {
          idempotencyKey: `password-reset-${user.id}-${Date.now()}`,
          traceId: user.id
        }
      );
    } catch (emailError) {
      console.warn("Failed to send password reset email notification:", emailError);
      return NextResponse.json(
        {
          error: t(
            "Failed to send password reset email. Please try again later.",
            "auth.forgot-password.route.POST.failed_to_send_password_reset_email_please_try_again_later__1ym1ap",
          ),
        },
        {
          status: 500,
        },
      );
    }
    return NextResponse.json(
      {
        message: t(
          "If an account with that email exists, a password reset link has been sent.",
          "auth.forgot-password.route.POST.if_an_account_with_that_email_exists_a_password_reset_link_has_been_sent__1sc7ws",
        ),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        error: t(
          "Internal server error",
          "auth.forgot-password.route.POST.internal_server_error__1xiwva",
        ),
      },
      {
        status: 500,
      },
    );
  }
}
