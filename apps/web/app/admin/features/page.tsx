"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { toast } from "@ui/base";
import { Switch } from "@ui/base";
import { 
  Settings, 
  Zap, 
  ArrowLeft, 
  Shield, 
  Users, 
  Bell, 
  Key,
  Activity,
  Webhook,
  UserCheck,
  MessageSquare,
  RefreshCw 
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AdminPageLayout } from "@/components/AdminPageLayout";

const getFeatureIcon = (key: string) => {
  switch (key) {
    case 'multi_tenant': return <Users className="h-5 w-5 text-blue-600" />;
    case 'tenant_registration': return <UserCheck className="h-5 w-5 text-green-600" />;
    case 'audit_logging': return <Activity className="h-5 w-5 text-purple-600" />;
    case 'notifications': return <Bell className="h-5 w-5 text-orange-600" />;
    case 'passkey_auth': return <Key className="h-5 w-5 text-indigo-600" />;
    case 'two_factor_auth': return <Shield className="h-5 w-5 text-red-600" />;
    case 'support_system': return <MessageSquare className="h-5 w-5 text-cyan-600" />;
    case 'webhooks': return <Webhook className="h-5 w-5 text-yellow-600" />;
    default: return <Zap className="h-5 w-5 text-gray-600" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'Core': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Secondary': return 'bg-green-100 text-green-800 border-green-200';
    case 'Tenancy-only': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function AdminFeaturesPage() {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch feature definitions
  const { data: features, isLoading, refetch } = trpc.listFeatureDefinitions.useQuery();

  // Mutations
  const setGlobalRule = trpc.setGlobalFeatureRule.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Feature toggle updated successfully");
      setIsUpdating(null);
    },
    onError: (error) => {
      toast.error(`Failed to update feature: ${error.message}`);
      setIsUpdating(null);
    }
  });

  const removeGlobalRule = trpc.removeGlobalFeatureRule.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Feature rule removed successfully");
      setIsUpdating(null);
    },
    onError: (error) => {
      toast.error(`Failed to remove feature rule: ${error.message}`);
      setIsUpdating(null);
    }
  });

  const handleFeatureToggle = async (featureKey: string, currentlyEnabled: boolean | undefined) => {
    setIsUpdating(featureKey);
    
    if (currentlyEnabled === undefined) {
      // No global rule exists, create one
      await setGlobalRule.mutateAsync({
        featureKey,
        enabled: true
      });
    } else {
      if (currentlyEnabled) {
        // Currently enabled, disable it
        await setGlobalRule.mutateAsync({
          featureKey,
          enabled: false
        });
      } else {
        // Currently disabled, enable it
        await setGlobalRule.mutateAsync({
          featureKey,
          enabled: true
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AdminPageLayout
      title="Feature Toggles"
      description="Manage global feature flags and platform capabilities"
      actions={
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features?.map((feature) => {
          const isEnabled = feature.globalEnabled;
          const hasGlobalRule = feature.hasGlobalRule;
          const effectiveEnabled = hasGlobalRule ? isEnabled : feature.defaultEnabled;
          
          return (
            <Card key={feature.key} className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-gray-50">
                      {getFeatureIcon(feature.key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {feature.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getTierColor(feature.tier)}>
                          {feature.tier}
                        </Badge>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {feature.key}
                        </code>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={effectiveEnabled}
                    disabled={isUpdating === feature.key}
                    onCheckedChange={() => handleFeatureToggle(feature.key, isEnabled)}
                    className="ml-2 flex-shrink-0"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm text-gray-600 mb-4">
                  {feature.description}
                </CardDescription>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        effectiveEnabled ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        effectiveEnabled ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {effectiveEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Source:</span>
                    <span className="text-gray-900 font-medium">
                      {hasGlobalRule ? 'Global Rule' : 'Default'}
                    </span>
                  </div>
                  
                  {feature.tenantRuleCount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Tenant Overrides:</span>
                      <span className="text-gray-900 font-medium">
                        {feature.tenantRuleCount}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Features State */}
      {features && features.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Feature Definitions Found
            </h3>
            <p className="text-gray-600 mb-4">
              Run the database setup to initialize core features.
            </p>
            <Button 
              variant="outline"
              onClick={() => toast.info("Run `pnpm run db:setup` to initialize features")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Initialize Features
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}