import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";
import { hashPassword, generateEmailVerificationToken } from "@shared/base";
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
    if (existingUser) {
      return NextResponse.json(
        {
          error: t(
            "User with this email already exists",
            "auth.signup.route.POST.user_with_this_email_already_exists__t5doct",
          ),
        },
        {
          status: 400,
        },
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

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

    // Create user first
    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        hashedPassword,
        isEmailVerified: false,
      },
    });

    // Generate email verification token with actual user ID
    const verificationToken = generateEmailVerificationToken(
      user.id,
      validatedData.email,
      jwtSecret,
    );

    // Update user with verification token
    await db.user.update({
      where: {
        id: user.id,
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
      console.warn("Failed to send registration email, but user was created");
      // Don't fail the signup if webhook fails, just log it
    }

    // Return success (don't return the hashed password or token)
    return NextResponse.json(
      {
        message: t(
          "User created successfully. Please check your email to verify your account.",
          "auth.signup.route.POST.user_created_successfully_please_check_your_email_to_verify_your_account__2g7avc",
        ),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
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
