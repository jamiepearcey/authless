import { NextRequest, NextResponse } from "next/server";
import { db } from "@db/base";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get("slug");

    if (!tenantSlug) {
      return NextResponse.json({ hasSSO: false, ssoEnabled: false });
    }

    // Check if tenant has SSO configuration
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      include: {
        ssoConfiguration: true
      }
    });

    if (!tenant || !tenant.ssoConfiguration) {
      return NextResponse.json({ hasSSO: false, ssoEnabled: false });
    }

    return NextResponse.json({
      hasSSO: true,
      ssoEnabled: tenant.ssoConfiguration.isEnabled,
      provider: tenant.ssoConfiguration.provider
    });

  } catch (error) {
    console.error("Error checking tenant SSO:", error);
    return NextResponse.json({ hasSSO: false, ssoEnabled: false });
  }
}