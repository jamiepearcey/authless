import { NextRequest, NextResponse } from 'next/server';
import { db } from '@db/base';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hostname = searchParams.get('hostname');
    
    if (!hostname) {
      return NextResponse.json({ error: 'hostname is required' }, { status: 400 });
    }
    
    // Skip database lookup for localhost
    if (hostname.includes('localhost')) {
      return NextResponse.json({ tenantSlug: null });
    }
    
    // Check if this is a custom domain that maps to a specific tenant
    const tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { domainAlias: hostname },
          { customDomain: hostname }
        ],
        status: 'active'
      },
      select: { slug: true }
    });
    
    return NextResponse.json({ tenantSlug: tenant?.slug || null });
  } catch (error) {
    console.error('Failed to resolve domain:', error);
    return NextResponse.json({ tenantSlug: null });
  }
}