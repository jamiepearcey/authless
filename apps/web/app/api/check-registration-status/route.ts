import { NextRequest, NextResponse } from 'next/server';
import { db } from '@db/base';

export async function GET(req: NextRequest) {
  try {
    const hostname = req.headers.get('host') || '';
    
    // For localhost, allow registration
    if (hostname.includes('localhost')) {
      return NextResponse.json({ registrationClosed: false });
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
      select: { registrationClosed: true }
    });
    
    if (tenant) {
      return NextResponse.json({ registrationClosed: tenant.registrationClosed });
    }
    
    // For main domain or unknown domains, allow registration
    return NextResponse.json({ registrationClosed: false });
  } catch (error) {
    console.error('Failed to check registration status:', error);
    // Default to allowing registration if there's an error
    return NextResponse.json({ registrationClosed: false });
  }
}