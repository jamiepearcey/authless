import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";

// SSO Initiation Handler
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  const { tenantSlug } = params;
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  try {
    // Get tenant SSO configuration
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        ssoConfiguration: true
      }
    });

    if (!tenant || !tenant.ssoConfiguration || !tenant.ssoConfiguration.isEnabled) {
      // Fallback to standard signin if SSO not configured
      const fallbackUrl = new URL("/auth/signin", request.url);
      fallbackUrl.searchParams.set("callbackUrl", callbackUrl);
      fallbackUrl.searchParams.set("error", "sso_not_configured");
      return NextResponse.redirect(fallbackUrl);
    }

    const ssoConfig = tenant.ssoConfiguration;

    // Create audit log entry
    await db.ssoAuditLog.create({
      data: {
        tenantId: tenant.id,
        event: "SSO_INITIATION",
        provider: ssoConfig.provider,
        ipAddress: request.ip || request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        attributes: {
          tenantSlug,
          callbackUrl,
          provider: ssoConfig.provider
        }
      }
    });

    // Handle different SSO providers
    switch (ssoConfig.provider) {
      case "saml":
        return handleSamlInitiation(ssoConfig, tenantSlug, callbackUrl, request);
      
      case "oidc":
      case "azure-ad":
      case "google-workspace":
        return handleOidcInitiation(ssoConfig, tenantSlug, callbackUrl, request);
      
      default:
        throw new Error(`Unsupported SSO provider: ${ssoConfig.provider}`);
    }

  } catch (error) {
    console.error("SSO initiation error:", error);
    
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
              callbackUrl,
              errorType: "initiation_error"
            }
          }
        });
      }
    } catch (logError) {
      console.error("Failed to log SSO error:", logError);
    }

    // Fallback to standard signin
    const fallbackUrl = new URL("/auth/signin", request.url);
    fallbackUrl.searchParams.set("callbackUrl", callbackUrl);
    fallbackUrl.searchParams.set("error", "sso_error");
    return NextResponse.redirect(fallbackUrl);
  }
}

// SAML Initiation Handler
function handleSamlInitiation(
  ssoConfig: any,
  tenantSlug: string,
  callbackUrl: string,
  request: NextRequest
) {
  // For SAML, we need to generate a SAML request and redirect to IdP
  // This is a simplified implementation - in production you'd use a proper SAML library
  
  const samlRequestId = `_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const issuer = `${request.nextUrl.origin}/auth/sso/${tenantSlug}`;
  const acsUrl = `${request.nextUrl.origin}/auth/callback/sso/${tenantSlug}`;
  
  // Create a basic SAML AuthnRequest (simplified)
  const samlRequest = `
    <samlp:AuthnRequest 
      xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
      xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
      ID="${samlRequestId}"
      Version="2.0"
      IssueInstant="${new Date().toISOString()}"
      Destination="${ssoConfig.samlSsoUrl}"
      AssertionConsumerServiceURL="${acsUrl}"
      ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>${issuer}</saml:Issuer>
    </samlp:AuthnRequest>
  `.trim();

  // Base64 encode and URL encode the SAML request
  const encodedRequest = Buffer.from(samlRequest).toString('base64');
  
  // Build the redirect URL
  const redirectUrl = new URL(ssoConfig.samlSsoUrl);
  redirectUrl.searchParams.set('SAMLRequest', encodedRequest);
  redirectUrl.searchParams.set('RelayState', callbackUrl);
  
  return NextResponse.redirect(redirectUrl);
}

// OIDC/OAuth2 Initiation Handler
function handleOidcInitiation(
  ssoConfig: any,
  tenantSlug: string,
  callbackUrl: string,
  request: NextRequest
) {
  const state = `${tenantSlug}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const nonce = Math.random().toString(36).substr(2, 16);
  
  // Build authorization URL based on provider
  let authUrl: URL;
  
  if (ssoConfig.provider === "azure-ad") {
    authUrl = new URL(`${ssoConfig.oidcIssuer}/oauth2/v2.0/authorize`);
  } else if (ssoConfig.provider === "google-workspace") {
    authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  } else {
    // Generic OIDC
    authUrl = new URL(`${ssoConfig.oidcIssuer}/auth`);
  }
  
  const redirectUri = `${request.nextUrl.origin}/auth/callback/sso/${tenantSlug}`;
  
  authUrl.searchParams.set('client_id', ssoConfig.oidcClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', ssoConfig.oidcScope || 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);
  
  // Store state and callback URL in session/database for validation
  // In production, you'd want to store this more securely
  
  return NextResponse.redirect(authUrl);
}