import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";
import { verifyToken, hashPassword } from "@shared/base";
import { t } from "@i18n-core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;
    if (!token || !password) {
      return NextResponse.json(
        {
          error: t(
            "Token and password are required",
            "auth.reset-password.route.POST.token_and_password_are_required__1aaxio"
          )
        },
        {
          status: 400
        }
      );
    }

    // Get JWT secret from environment
    let jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // Fallback for development - in production, this should always be set
      jwtSecret =
      "super-secret-jwt-key-for-development-only-change-in-production";
      console.warn(
        "JWT_SECRET not found in environment, using fallback secret"
      );
    }

    // Verify token
    const decoded = verifyToken(token, jwtSecret);
    if (!decoded || decoded.type !== "password-reset") {
      return NextResponse.json(
        {
          error: t(
            "Invalid or expired reset token",
            "auth.reset-password.route.POST.invalid_or_expired_reset_token__1529jh"
          )
        },
        {
          status: 400
        }
      );
    }

    // Find user by token
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date()
        }
      }
    });
    if (!user) {
      return NextResponse.json(
        {
          error: t(
            "Invalid or expired reset token",
            "auth.reset-password.route.POST.invalid_or_expired_reset_token__1529jh"
          )
        },
        {
          status: 400
        }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await db.user.update({
      where: {
        id: user.id
      },
      data: {
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });
    return NextResponse.json(
      {
        message: t(
          "Password reset successfully. You can now sign in with your new password.",
          "auth.reset-password.route.POST.password_reset_successfully_you_can_now_sign_in_with_your_new_password__ttw84s"
        )
      },
      {
        status: 200
      }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      {
        error: t(
          "Internal server error",
          "auth.forgot-password.route.POST.internal_server_error__1xiwva"
        )
      },
      {
        status: 500
      }
    );
  }
}