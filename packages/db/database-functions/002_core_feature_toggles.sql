-- Core Feature Toggle Initialization
-- Description: Creates the default feature toggles for core platform features

-- ==========================================
-- INSERT CORE FEATURE DEFINITIONS
-- ==========================================

-- Multi-tenant support
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text, 
  'multi_tenant', 
  'Multi-Tenant Support', 
  'Enable support for multiple tenants with isolated data and configurations',
  'Core',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Tenant registration
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'tenant_registration', 
  'Tenant Registration', 
  'Allow new users to register and create their own tenants',
  'Core',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Audit logging
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'audit_logging', 
  'Audit Logging', 
  'Track and log all user actions and system events for compliance and security',
  'Core',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Notifications system
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'notifications', 
  'Notification System', 
  'Send in-app and email notifications to users about important events',
  'Core',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Passkey authentication
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'passkey_auth', 
  'Passkey Authentication', 
  'Enable WebAuthn/FIDO2 passkey authentication for enhanced security',
  'Secondary',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Two-factor authentication
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'two_factor_auth', 
  'Two-Factor Authentication', 
  'Require additional authentication factors for enhanced security',
  'Secondary',
  false,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Support system
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'support_system', 
  'Support System', 
  'Integrated customer support with ticketing and case management',
  'Core',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- Webhooks
INSERT INTO "FeatureDefinition" (id, key, name, description, tier, "defaultEnabled", "createdAt", "updatedAt", "createdBy") 
VALUES (
  gen_random_uuid()::text,
  'webhooks', 
  'Webhook System', 
  'Send HTTP callbacks to external services when events occur',
  'Secondary',
  false,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  "defaultEnabled" = EXCLUDED."defaultEnabled",
  "updatedAt" = NOW();

-- ==========================================
-- SET GLOBAL FEATURE RULES FOR DEFAULTS
-- ==========================================

-- Enable multi-tenant by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'multi_tenant',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- Enable tenant registration by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'tenant_registration',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- Enable audit logging by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'audit_logging',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- Enable notifications by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'notifications',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- Enable passkey authentication by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'passkey_auth',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- Enable support system by default globally
INSERT INTO "GlobalFeatureRule" (id, "featureKey", enabled, "createdAt", "updatedAt", "createdBy")
VALUES (
  gen_random_uuid()::text,
  'support_system',
  true,
  NOW(),
  NOW(),
  'system'
) ON CONFLICT ("featureKey") DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "updatedAt" = NOW();