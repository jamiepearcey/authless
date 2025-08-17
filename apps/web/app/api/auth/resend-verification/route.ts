import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";
import { generateEmailVerificationToken } from "@shared/base";
import {
  callRegistrationWebhook,
  constructEmailVerificationUrl,
} from "@shared/base";
import { createUserSchema } from "@shared/base";
import { t } from "@i18n-core";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: {
        email: validatedData.email,
      },
    });
    if (!existingUser) {
      return NextResponse.json(
        {
          error: t(
            "User does not exist",
            "auth.resend-verification.route.POST.user_does_not_exist__msdyig",
          ),
        },
        {
          status: 400,
        },
      );
    }
    if (existingUser.isEmailVerified) {
      return NextResponse.json(
        {
          error: t(
            "User already verified",
            "auth.resend-verification.route.POST.user_already_verified__1167dc",
          ),
        },
        {
          status: 400,
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

    // Generate email verification token with actual user ID
    const verificationToken = generateEmailVerificationToken(
      existingUser.id,
      validatedData.email,
      jwtSecret,
    );

    // Update user with verification token
    await db.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        emailVerificationToken: verificationToken,
      },
    });

    // Call registration webhook
    const webhookPayload = {
      email: validatedData.email,
      name: validatedData.name,
      token: verificationToken,
      action: "registration" as const,
      callbackUrl: constructEmailVerificationUrl(verificationToken),
    };
    const webhookSuccess = await callRegistrationWebhook(webhookPayload);
    if (!webhookSuccess) {
      return NextResponse.json(
        {
          error: t(
            "Failed to call registration webhook",
            "auth.resend-verification.route.POST.failed_to_call_registration_webhook__1f41b5",
          ),
        },
        {
          status: 500,
        },
      );
    }

    // Return success (don't return the hashed password or token)
    return NextResponse.json(
      {
        message: t(
          "Verification token created successfully. Please check your email to verify your account.",
          "auth.resend-verification.route.POST.verification_token_created_successfully_please_check_your_email_to_verify_your_account__1hfrjz",
        ),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Signup error:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }
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
