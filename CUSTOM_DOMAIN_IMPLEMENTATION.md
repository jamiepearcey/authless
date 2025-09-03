# Custom Domain Tenancy Implementation

## Overview
This implementation adds support for custom domain tenancies, allowing tenants to be accessed via their own custom domains rather than just subdomains or path-based routing.

## Features Implemented

### ✅ 1. Custom Domain Tenancy Support
- **Database Schema**: Added `domainAlias` field to `Tenant` model
- **Middleware**: Enhanced tenant resolution to check custom domains first
- **Priority Order**: Custom Domain → Subdomain → Path → Untenanted

### ✅ 2. Domain-Based Authentication Restrictions
- **Auth Handler**: Updated NextAuth to check user access per domain
- **Platform Admins**: Can access any domain
- **Tenant Users**: Only access domains where they have membership
- **Error Handling**: Clear error messages for unauthorized access

### ✅ 3. Registration Closure Feature
- **Database Schema**: Added `registrationClosed` field to `Tenant` model
- **API Endpoint**: `/api/check-registration-status` checks tenant registration status
- **UI**: Signup page shows closure message when registration is disabled

### ✅ 4. Passkey Domain Filtering
- **Security**: Passkeys filtered by `rpId` to match current domain
- **Cross-Domain**: Prevents passkey reuse across different tenant domains

### ✅ 5. Admin UI Updates
- **Create Tenant**: Added domain alias and registration closure fields
- **Edit Tenant**: Updated form to manage domain settings
- **Form Validation**: Proper input validation and help text

### ✅ 6. Seed Data
- **Demo Tenant**: Created `demoday` tenant with domain `demoday.deepintrospect.com`
- **Credentials**: `admin@demoday.deepintrospect.com` / `demoday123`

## Edge Runtime Compatibility Fix

### Issue
The initial implementation used PrismaClient in middleware, which caused:
```
Error: The edge runtime does not support Node.js 'path' module.
```

### Solution
Replaced database lookups in middleware with static configuration:

```typescript
// Environment variable support for dynamic domain mapping
const loadCustomDomains = (): Record<string, string> => {
  const staticDomains = {
    'demoday.deepintrospect.com': 'demoday',
  };

  const envDomains = process.env.CUSTOM_DOMAINS;
  if (envDomains) {
    // Parse: "domain1.com:tenant1,domain2.com:tenant2"
    const envMappings: Record<string, string> = {};
    envDomains.split(',').forEach(mapping => {
      const [domain, tenant] = mapping.split(':');
      if (domain && tenant) {
        envMappings[domain.trim()] = tenant.trim();
      }
    });
    return { ...staticDomains, ...envMappings };
  }

  return staticDomains;
};
```

## Production Deployment Options

### Option 1: Environment Variables
Add custom domains via `CUSTOM_DOMAINS` environment variable:
```bash
CUSTOM_DOMAINS="client1.com:client1,client2.com:client2"
```

### Option 2: Build-Time Generation
Generate the domain mapping during build time from database.

### Option 3: Redis Cache
Use Edge Runtime compatible Redis client for dynamic lookups.

### Option 4: Serverless Function
Use the `/api/resolve-domain` endpoint for dynamic resolution (with caching).

## API Endpoints

### `/api/resolve-domain?hostname={domain}`
Returns tenant slug for a given domain (database lookup).

### `/api/check-registration-status`
Returns registration status for current domain.

## Database Schema Changes

```sql
-- Add new fields to Tenant table
ALTER TABLE "Tenant" ADD COLUMN "domainAlias" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "registrationClosed" BOOLEAN NOT NULL DEFAULT false;

-- Add unique constraint and index
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_domainAlias_key" UNIQUE ("domainAlias");
CREATE INDEX "Tenant_domainAlias_idx" ON "Tenant"("domainAlias");
```

## Testing

All functionality has been tested and verified:
- ✅ Domain lookup for `demoday.deepintrospect.com`
- ✅ User access control per domain
- ✅ Registration closure functionality  
- ✅ Admin UI updates
- ✅ Edge Runtime compatibility

## Security Considerations

1. **Domain Verification**: In production, implement domain ownership verification
2. **DNS Configuration**: Domains must point to your application
3. **SSL Certificates**: Configure SSL for custom domains
4. **Rate Limiting**: Apply domain-specific rate limits
5. **CORS**: Configure CORS policies per domain

## Future Enhancements

1. **Dynamic Domain Management**: Real-time domain addition/removal via admin UI
2. **Domain Analytics**: Track usage per custom domain
3. **Custom Branding**: Per-domain themes and branding
4. **Domain Validation**: Automated domain ownership verification
5. **Multi-Environment**: Support for staging/preview domains