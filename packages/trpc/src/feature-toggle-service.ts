import { db } from "@db/base";
import type { FeatureDefinition, GlobalFeatureRule, TenantFeatureRule, FeatureAuditEntry } from "@db/base";

// Feature tier types
export type FeatureTier = "Core" | "Secondary" | "Tenancy-only";

// Evaluation context
export interface FeatureContext {
  tenantId?: string;
  userId?: string;
}

// Effective feature state
export interface EffectiveFeature {
  key: string;
  name: string;
  description?: string;
  tier: FeatureTier;
  enabled: boolean;
  source: "default" | "global" | "tenant";
  globalDefault?: boolean;
  globalOverride?: boolean;
  tenantOverride?: boolean;
}

// Audit action types
export type AuditAction = "create" | "update" | "delete" | "enable" | "disable";

// Cache interface (to be implemented with Redis or in-memory cache)
interface FeatureCache {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

// Simple in-memory cache implementation (replace with Redis in production)
class InMemoryCache implements FeatureCache {
  private cache = new Map<string, { value: any; expires: number }>();

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

export class FeatureToggleService {
  private cache: FeatureCache;
  private cacheVersion = 0;

  constructor(cache?: FeatureCache) {
    this.cache = cache || new InMemoryCache();
  }

  /**
   * Evaluate a single feature for a given context
   * Precedence: tenant override → global rule → feature default
   */
  async evaluateFeature(featureKey: string, context: FeatureContext = {}): Promise<boolean> {
    const cacheKey = `feature:${featureKey}:${context.tenantId || 'global'}:v${this.cacheVersion}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Get feature definition
    const feature = await db.featureDefinition.findUnique({
      where: { key: featureKey },
      include: {
        globalRules: true,
        tenantRules: context.tenantId ? {
          where: { tenantId: context.tenantId }
        } : false
      }
    });

    if (!feature) {
      // Feature not found, return false
      await this.cache.set(cacheKey, false, 60);
      return false;
    }

    let enabled = feature.defaultEnabled;

    // Check global rule
    if (feature.globalRules) {
      enabled = feature.globalRules.enabled;
    }

    // Check tenant override (if applicable and tenant context provided)
    if (context.tenantId && feature.tenantRules && feature.tenantRules.length > 0) {
      enabled = feature.tenantRules[0].enabled;
    }

    // Cache the result
    await this.cache.set(cacheKey, enabled);
    return enabled;
  }

  /**
   * Get effective features for a context (returns a map for efficient client-side use)
   */
  async getEffectiveFeatures(context: FeatureContext = {}): Promise<Record<string, boolean>> {
    const cacheKey = `features:${context.tenantId || 'global'}:v${this.cacheVersion}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all features with their rules
    const features = await db.featureDefinition.findMany({
      include: {
        globalRules: true,
        tenantRules: context.tenantId ? {
          where: { tenantId: context.tenantId }
        } : false
      }
    });

    const effectiveFeatures: Record<string, boolean> = {};

    for (const feature of features) {
      let enabled = feature.defaultEnabled;

      // Check global rule
      if (feature.globalRules) {
        enabled = feature.globalRules.enabled;
      }

      // Check tenant override (if applicable)
      if (context.tenantId && feature.tenantRules && feature.tenantRules.length > 0) {
        enabled = feature.tenantRules[0].enabled;
      }

      effectiveFeatures[feature.key] = enabled;
    }

    // Cache the result
    await this.cache.set(cacheKey, effectiveFeatures);
    return effectiveFeatures;
  }

  /**
   * Get detailed feature information with sources
   */
  async getDetailedFeatures(context: FeatureContext = {}): Promise<EffectiveFeature[]> {
    const features = await db.featureDefinition.findMany({
      include: {
        globalRules: true,
        tenantRules: context.tenantId ? {
          where: { tenantId: context.tenantId }
        } : false
      },
      orderBy: [
        { tier: 'asc' },
        { name: 'asc' }
      ]
    });

    return features.map(feature => {
      let enabled = feature.defaultEnabled;
      let source: "default" | "global" | "tenant" = "default";

      const hasGlobalRule = !!feature.globalRules;
      const hasTenantRule = context.tenantId && feature.tenantRules && feature.tenantRules.length > 0;

      // Apply precedence rules
      if (hasGlobalRule && feature.globalRules) {
        enabled = feature.globalRules.enabled;
        source = "global";
      }

      if (hasTenantRule) {
        enabled = feature.tenantRules![0].enabled;
        source = "tenant";
      }

      return {
        key: feature.key,
        name: feature.name,
        description: feature.description || undefined,
        tier: feature.tier as FeatureTier,
        enabled,
        source,
        globalDefault: feature.defaultEnabled,
        globalOverride: hasGlobalRule && feature.globalRules ? feature.globalRules.enabled : undefined,
        tenantOverride: hasTenantRule ? feature.tenantRules![0].enabled : undefined
      };
    });
  }

  /**
   * Create or update a global feature rule
   */
  async setGlobalRule(featureKey: string, enabled: boolean, userId: string): Promise<void> {
    // Verify feature exists
    const feature = await db.featureDefinition.findUnique({
      where: { key: featureKey }
    });

    if (!feature) {
      throw new Error(`Feature ${featureKey} not found`);
    }

    // Check if feature tier allows global rules
    if (feature.tier === "Tenancy-only") {
      throw new Error(`Feature ${featureKey} is tenancy-only and cannot have global rules`);
    }

    // Get current rule for audit
    const currentRule = await db.globalFeatureRule.findUnique({
      where: { featureKey }
    });

    const beforeValue = currentRule ? JSON.stringify({ enabled: currentRule.enabled }) : null;
    const afterValue = JSON.stringify({ enabled });

    // Upsert the rule
    await db.globalFeatureRule.upsert({
      where: { featureKey },
      create: {
        featureKey,
        enabled,
        createdBy: userId
      },
      update: {
        enabled,
        updatedAt: new Date(),
        createdBy: userId
      }
    });

    // Create audit entry
    await this.createAuditEntry({
      featureKey,
      scope: "global",
      beforeValue,
      afterValue,
      action: currentRule ? "update" : "create",
      createdBy: userId
    });

    // Invalidate cache
    await this.invalidateCache(featureKey);
  }

  /**
   * Create or update a tenant feature rule
   */
  async setTenantRule(featureKey: string, tenantId: string, enabled: boolean, userId: string): Promise<void> {
    // Verify feature exists and check tier permissions
    const feature = await db.featureDefinition.findUnique({
      where: { key: featureKey }
    });

    if (!feature) {
      throw new Error(`Feature ${featureKey} not found`);
    }

    // Core features cannot be overridden by tenants
    if (feature.tier === "Core") {
      throw new Error(`Feature ${featureKey} is a core feature and cannot be overridden by tenants`);
    }

    // Get current rule for audit
    const currentRule = await db.tenantFeatureRule.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } }
    });

    const beforeValue = currentRule ? JSON.stringify({ enabled: currentRule.enabled }) : null;
    const afterValue = JSON.stringify({ enabled });

    // Upsert the rule
    await db.tenantFeatureRule.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: {
        tenantId,
        featureKey,
        enabled,
        createdBy: userId
      },
      update: {
        enabled,
        updatedAt: new Date(),
        createdBy: userId
      }
    });

    // Create audit entry
    await this.createAuditEntry({
      featureKey,
      scope: "tenant",
      tenantId,
      beforeValue,
      afterValue,
      action: currentRule ? "update" : "create",
      createdBy: userId
    });

    // Invalidate cache
    await this.invalidateCache(featureKey, tenantId);
  }

  /**
   * Remove a global feature rule (revert to default)
   */
  async removeGlobalRule(featureKey: string, userId: string): Promise<void> {
    const currentRule = await db.globalFeatureRule.findUnique({
      where: { featureKey }
    });

    if (!currentRule) {
      return; // Already removed
    }

    const beforeValue = JSON.stringify({ enabled: currentRule.enabled });

    await db.globalFeatureRule.delete({
      where: { featureKey }
    });

    // Create audit entry
    await this.createAuditEntry({
      featureKey,
      scope: "global",
      beforeValue,
      afterValue: null,
      action: "delete",
      createdBy: userId
    });

    // Invalidate cache
    await this.invalidateCache(featureKey);
  }

  /**
   * Remove a tenant feature rule (revert to global/default)
   */
  async removeTenantRule(featureKey: string, tenantId: string, userId: string): Promise<void> {
    const currentRule = await db.tenantFeatureRule.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } }
    });

    if (!currentRule) {
      return; // Already removed
    }

    const beforeValue = JSON.stringify({ enabled: currentRule.enabled });

    await db.tenantFeatureRule.delete({
      where: { tenantId_featureKey: { tenantId, featureKey } }
    });

    // Create audit entry
    await this.createAuditEntry({
      featureKey,
      scope: "tenant",
      tenantId,
      beforeValue,
      afterValue: null,
      action: "delete",
      createdBy: userId
    });

    // Invalidate cache
    await this.invalidateCache(featureKey, tenantId);
  }

  /**
   * Create an audit entry
   */
  private async createAuditEntry(data: {
    featureKey: string;
    scope: string;
    tenantId?: string;
    beforeValue: string | null;
    afterValue: string | null;
    action: AuditAction;
    createdBy: string;
  }): Promise<void> {
    await db.featureAuditEntry.create({
      data
    });
  }

  /**
   * Invalidate cache for a feature
   */
  private async invalidateCache(featureKey?: string, tenantId?: string): Promise<void> {
    this.cacheVersion++;
    
    if (featureKey && tenantId) {
      // Invalidate specific tenant feature
      await this.cache.del(`feature:${featureKey}:${tenantId}:*`);
      await this.cache.del(`features:${tenantId}:*`);
    } else if (featureKey) {
      // Invalidate all instances of a feature
      await this.cache.invalidatePattern(`feature:${featureKey}:*`);
      await this.cache.invalidatePattern(`features:*`);
    } else {
      // Invalidate all feature caches
      await this.cache.invalidatePattern(`feature:*`);
      await this.cache.invalidatePattern(`features:*`);
    }
  }

  /**
   * Get audit history for a feature
   */
  async getAuditHistory(featureKey: string, tenantId?: string, limit = 50): Promise<FeatureAuditEntry[]> {
    return db.featureAuditEntry.findMany({
      where: {
        featureKey,
        ...(tenantId && { tenantId })
      },
      include: {
        feature: true,
        tenant: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

// Singleton instance
export const featureToggleService = new FeatureToggleService();
