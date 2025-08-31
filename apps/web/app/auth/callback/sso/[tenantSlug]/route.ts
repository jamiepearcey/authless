import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";

// SSO Callback Handler
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  const { tenantSlug } = params;

  try {
    // Get tenant SSO configuration
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        ssoConfiguration: true
      }
    });

    if (!tenant || !tenant.ssoConfiguration || !tenant.ssoConfiguration.isEnabled) {
      throw new Error("SSO not configured for this tenant");
    }

    const ssoConfig = tenant.ssoConfiguration;

    // Handle different providers
    let userInfo: any;
    
    if (ssoConfig.provider === "saml") {
      userInfo = await handleSamlCallback(request);
    } else {
      userInfo = await handleOidcCallback(request, ssoConfig);
    }

    if (!userInfo) {
      throw new Error("Failed to extract user information from SSO response");
    }

    // Create or update user based on SSO info
    const user = await createOrUpdateUserFromSSO(userInfo, tenant.id, ssoConfig);

    // Create audit log
    await db.ssoAuditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        event: "SSO_SUCCESS",
        provider: ssoConfig.provider,
        ipAddress: request.ip || request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        attributes: {
          tenantSlug,
          email: userInfo.email,
          provider: ssoConfig.provider
        }
      }
    });

    // Create NextAuth session
    // Since we're in an API route, we'll redirect to a page that will handle the session creation
    const successUrl = new URL("/auth/sso/success", request.url);
    successUrl.searchParams.set("userId", user.id);
    successUrl.searchParams.set("tenantSlug", tenantSlug);
    successUrl.searchParams.set("callbackUrl", getCallbackUrl(request));

    return NextResponse.redirect(successUrl);

  } catch (error) {
    console.error("SSO callback error:", error);
    
    // Log the error
    try {
      const tenant = await db.tenant.findUnique({
        where: { slug: tenantSlug }
      });
      
      if (tenant) {
        await db.ssoAuditLog.create({
          data: {
            tenantId: tenant.id,
            event: "SSO_ERROR",
            provider: "unknown",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            ipAddress: request.ip || request.headers.get("x-forwarded-for") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
            attributes: {
              tenantSlug,
              errorType: "callback_error"
            }
          }
        });
      }
    } catch (logError) {
      console.error("Failed to log SSO error:", logError);
    }

    // Redirect to signin with error
    const errorUrl = new URL("/auth/signin", request.url);
    errorUrl.searchParams.set("error", "sso_callback_error");
    errorUrl.searchParams.set("callbackUrl", getCallbackUrl(request));
    
    return NextResponse.redirect(errorUrl);
  }
}

// Handle GET requests (for OIDC flows)
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  return POST(request, { params });
}

// SAML Callback Handler
async function handleSamlCallback(
  request: NextRequest
) {
  const formData = await request.formData();
  const samlResponse = formData.get("SAMLResponse") as string;

  if (!samlResponse) {
    throw new Error("No SAML response received");
  }

  // Decode and parse SAML response
  const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf8');
  
  // In a real implementation, you would:
  // 1. Validate the SAML response signature
  // 2. Verify the assertion is not expired
  // 3. Check the audience and issuer
  // 4. Extract user attributes
  
  // Simplified parsing (use proper SAML library in production)
  const emailMatch = decodedResponse.match(/<saml:AttributeValue[^>]*>([^<]*@[^<]*)<\/saml:AttributeValue>/);
  const nameMatch = decodedResponse.match(/<saml:AttributeValue[^>]*>([^<@]+\s+[^<@]+)<\/saml:AttributeValue>/);

  if (!emailMatch) {
    throw new Error("No email found in SAML response");
  }

  return {
    email: emailMatch[1],
    name: nameMatch?.[1] || emailMatch[1].split('@')[0],
    firstName: nameMatch?.[1]?.split(' ')[0] || emailMatch[1].split('@')[0],
    lastName: nameMatch?.[1]?.split(' ').slice(1).join(' ') || "",
    provider: "saml"
  };
}

// OIDC Callback Handler
async function handleOidcCallback(
  request: NextRequest,
  ssoConfig: any
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    throw new Error(`OIDC error: ${error}`);
  }

  if (!code) {
    throw new Error("No authorization code received");
  }

  // Exchange code for tokens
  const tokenResponse = await exchangeCodeForTokens(code, ssoConfig, request);
  
  // Get user info from ID token or userinfo endpoint
  const userInfo = await getUserInfoFromTokens(tokenResponse, ssoConfig);

  return userInfo;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(
  code: string,
  ssoConfig: any,
  request: NextRequest
) {
  let tokenUrl: string;
  
  if (ssoConfig.provider === "azure-ad") {
    tokenUrl = `${ssoConfig.oidcIssuer}/oauth2/v2.0/token`;
  } else if (ssoConfig.provider === "google-workspace") {
    tokenUrl = "https://oauth2.googleapis.com/token";
  } else {
    tokenUrl = `${ssoConfig.oidcIssuer}/token`;
  }

  const redirectUri = `${request.nextUrl.origin}/auth/callback/sso/${ssoConfig.tenantId}`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ssoConfig.oidcClientId,
      client_secret: ssoConfig.oidcClientSecret,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

// Get user info from tokens
async function getUserInfoFromTokens(tokenResponse: any, ssoConfig: any) {
  // If we have an ID token, decode it
  if (tokenResponse.id_token) {
    const payload = JSON.parse(
      Buffer.from(tokenResponse.id_token.split('.')[1], 'base64').toString()
    );
    
    return {
      email: payload.email || payload.upn || payload.preferred_username,
      name: payload.name,
      firstName: payload.given_name || payload.firstname,
      lastName: payload.family_name || payload.lastname,
      provider: ssoConfig.provider
    };
  }

  // Otherwise, call userinfo endpoint
  let userinfoUrl: string;
  
  if (ssoConfig.provider === "azure-ad") {
    userinfoUrl = `${ssoConfig.oidcIssuer}/oidc/userinfo`;
  } else if (ssoConfig.provider === "google-workspace") {
    userinfoUrl = "https://openidconnect.googleapis.com/v1/userinfo";
  } else {
    userinfoUrl = `${ssoConfig.oidcIssuer}/userinfo`;
  }

  const response = await fetch(userinfoUrl, {
    headers: {
      'Authorization': `Bearer ${tokenResponse.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Userinfo request failed: ${response.statusText}`);
  }

  const userInfo = await response.json();

  return {
    email: userInfo.email || userInfo.upn || userInfo.preferred_username,
    name: userInfo.name,
    firstName: userInfo.given_name || userInfo.firstname,
    lastName: userInfo.family_name || userInfo.lastname,
    provider: ssoConfig.provider
  };
}

// Create or update user from SSO information
async function createOrUpdateUserFromSSO(
  userInfo: any,
  tenantId: string,
  ssoConfig: any
) {
  const email = userInfo.email;
  
  if (!email) {
    throw new Error("No email provided in SSO response");
  }

  // Apply attribute mapping
  const mappedUserInfo = {
    email: userInfo[ssoConfig.attributeMapping?.email || 'email'] || userInfo.email,
    name: userInfo[ssoConfig.attributeMapping?.displayName || 'name'] || userInfo.name,
    firstName: userInfo[ssoConfig.attributeMapping?.firstName || 'firstName'] || userInfo.firstName,
    lastName: userInfo[ssoConfig.attributeMapping?.lastName || 'lastName'] || userInfo.lastName,
  };

  // Check if user already exists
  let user = await db.user.findUnique({
    where: { email: mappedUserInfo.email }
  });

  if (user) {
    // Update existing user
    user = await db.user.update({
      where: { id: user.id },
      data: {
        name: mappedUserInfo.name || user.name,
        lastLoginAt: new Date(),
        isEmailVerified: true, // SSO users are considered verified
      }
    });
  } else {
    // Create new user
    user = await db.user.create({
      data: {
        email: mappedUserInfo.email,
        name: mappedUserInfo.name,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        // No password for SSO users
        hashedPassword: null,
      }
    });

    // TODO: Add user to tenant if not already a member
    // This would require a TenantUser or similar model to be implemented
    // const existingMembership = await db.tenantUser.findUnique({
    //   where: { tenantId_userId: { tenantId: tenantId, userId: user.id } }
    // });
    // if (!existingMembership) {
    //   await db.tenantUser.create({
    //     data: { tenantId: tenantId, userId: user.id, role: "member", joinedAt: new Date() }
    //   });
    // }
  }

  return user;
}

// Extract callback URL from request
function getCallbackUrl(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get("RelayState") || searchParams.get("state") || "/";
}