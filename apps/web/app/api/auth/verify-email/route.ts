import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";
import { verifyToken } from "@shared/base";
import { t } from "@i18n-core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    if (!token) {
      return NextResponse.json(
        {
          error: t(
            "Verification token is required",
            "auth.verify-email.route.POST.verification_token_is_required__1rv3j3"
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
    if (!decoded || decoded.type !== "email-verification") {
      return NextResponse.json(
        {
          error: t(
            "Invalid or expired verification token",
            "auth.verify-email.route.POST.invalid_or_expired_verification_token__2qe7wx"
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
        emailVerificationToken: token
      }
    });
    if (!user) {
      return NextResponse.json(
        {
          error: t(
            "Invalid verification token",
            "auth.verify-email.route.POST.invalid_verification_token__quy6oi"
          )
        },
        {
          status: 400
        }
      );
    }

    // Update user as verified
    await db.user.update({
      where: {
        id: user.id
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerified: new Date()
      }
    });
    return NextResponse.json(
      {
        message: t(
          "Email verified successfully. You can now sign in to your account.",
          "auth.verify-email.route.POST.email_verified_successfully_you_can_now_sign_in_to_your_account__7nkyff"
        )
      },
      {
        status: 200
      }
    );
  } catch (error) {
    console.error("Email verification error:", error);
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