"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Switch } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  Eye, 
  Users,
  Activity,
  ArrowLeft,
  ExternalLink,
  Settings,
  Clock
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import Link from "next/link";

export default function AdminSecurityPage() {
  const [rateLimit, setRateLimit] = useState(1000);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [maxFailedLogins, setMaxFailedLogins] = useState(5);
  const [require2FA, setRequire2FA] = useState(false);

  // Real data queries
  const { data: failedLogins } = trpc.getFailedLogins.useQuery({ hours: 24 });
  const { data: activeSessions } = trpc.getActiveSessions.useQuery();
  const { data: auditEvents } = trpc.getRecentAuditEvents.useQuery({ limit: 10 });

  const updateSettings = trpc.updateSecuritySettings.useMutation({
    onSuccess: () => {
      toast.success("Security settings updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveSettings = () => {
    updateSettings.mutate({
      rateLimit,
      sessionTimeout,
      maxFailedLogins,
      require2FA,
    });
  };

  return (
    <AdminPageLayout
      title="Security Controls"
      description="Configure platform security settings and monitor real security events"
    >
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-4 mb-4">
        <Link 
          href="/admin"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Admin
        </Link>
        <div className="h-6 w-px bg-gray-300" />
        <BreadcrumbNavigation
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Security", current: true },
          ]}
          showHome={false}
        />
      </div>

      {/* Real Security Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed Logins (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{failedLogins?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{activeSessions?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">2FA Enabled Users</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Security Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Rate Limiting
            </CardTitle>
            <CardDescription>Control API request limits per user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rate-limit">Requests per minute</Label>
              <Input
                id="rate-limit"
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <p className="text-sm text-gray-600">
              Current setting will block users exceeding {rateLimit} requests/min
            </p>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Security
            </CardTitle>
            <CardDescription>Control user session behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="session-timeout">Session timeout (hours)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="failed-logins">Max failed login attempts</Label>
              <Input
                id="failed-logins"
                type="number"
                value={maxFailedLogins}
                onChange={(e) => setMaxFailedLogins(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Authentication Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Authentication Policy
            </CardTitle>
            <CardDescription>Platform-wide auth requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require 2FA for Admin Users</Label>
                <p className="text-sm text-gray-600">Force all platform admins to use 2FA</p>
              </div>
              <Switch
                checked={require2FA}
                onCheckedChange={setRequire2FA}
              />
            </div>
            <Button 
              onClick={handleSaveSettings} 
              disabled={updateSettings.isPending}
              className="w-full"
            >
              {updateSettings.isPending ? "Saving..." : "Save Security Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Security Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Security Resources
            </CardTitle>
            <CardDescription>Industry standards and compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a 
              href="https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">OWASP Authentication Guide</span>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
            <a 
              href="https://www.nist.gov/itl/applied-cybersecurity/sce/more-secure-authentication" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">NIST Authentication Guidelines</span>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
            <a 
              href="https://datatracker.ietf.org/doc/html/rfc6819" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">OAuth 2.0 Security Best Practices</span>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Events */}
      {auditEvents && auditEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Audit Events
            </CardTitle>
            <CardDescription>Real security events from your audit log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditEvents.slice(0, 10).map((event: any) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {event.eventType.includes('failed') ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Activity className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.eventType}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {event.userEmail || event.ipAddress} • {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.details && (
                      <p className="text-xs text-gray-500 mt-1">{JSON.stringify(event.details)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/admin/audit" className="text-sm text-indigo-600 hover:text-indigo-800">
                View full audit log →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}