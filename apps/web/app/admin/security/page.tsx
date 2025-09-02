"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Users,
  Activity,
  Lock,
  Globe,
  Database,
  Server,
  ArrowLeft
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import Link from "next/link";

export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock security data - would be replaced with real queries
  const securityMetrics = {
    activeThreats: 0,
    blockedAttempts: 247,
    activeSessions: 1834,
    failedLogins: 23,
    sslStatus: "valid",
    lastSecurityScan: "2024-08-31T10:00:00Z",
    vulnerabilities: {
      critical: 0,
      high: 1,
      medium: 3,
      low: 7
    }
  };

  const recentSecurityEvents = [
    {
      id: 1,
      type: "failed_login",
      severity: "low",
      description: "Multiple failed login attempts from IP 192.168.1.100",
      timestamp: "2024-08-31T09:45:00Z",
      resolved: true
    },
    {
      id: 2,
      type: "suspicious_activity",
      severity: "medium", 
      description: "Unusual API request pattern detected from tenant 'acme-corp'",
      timestamp: "2024-08-31T08:30:00Z",
      resolved: false
    },
    {
      id: 3,
      type: "security_update",
      severity: "info",
      description: "Security patch applied successfully to database server",
      timestamp: "2024-08-31T07:00:00Z",
      resolved: true
    }
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Critical</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-100 text-orange-800">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="text-gray-600">Low</Badge>;
      case "info":
        return <Badge variant="outline" className="text-blue-600">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusIcon = (resolved: boolean) => {
    return resolved ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
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
              { label: "Security Management", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Shield className="h-8 w-8 text-indigo-600" />
              <span>Security Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor platform security, manage threats, and configure security settings
            </p>
          </div>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold text-gray-900">{securityMetrics.activeThreats}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked Attempts</p>
                <p className="text-2xl font-bold text-gray-900">{securityMetrics.blockedAttempts}</p>
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
                <p className="text-2xl font-bold text-gray-900">{securityMetrics.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Key className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                <p className="text-2xl font-bold text-gray-900">{securityMetrics.failedLogins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Threats
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Access Control
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Security Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Security Status</CardTitle>
                <CardDescription>Current security posture and health checks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-green-600" />
                      <span className="text-sm">SSL Certificate</span>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Database Security</span>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">Secure</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Server className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Server Hardening</span>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">Applied</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Firewall Rules</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Needs Review</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vulnerability Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Report</CardTitle>
                <CardDescription>
                  Last scan: {new Date(securityMetrics.lastSecurityScan).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Critical</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-red-600">{securityMetrics.vulnerabilities.critical}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-red-600 rounded-full" style={{width: '0%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">High</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-orange-600">{securityMetrics.vulnerabilities.high}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-orange-600 rounded-full" style={{width: '10%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Medium</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-yellow-600">{securityMetrics.vulnerabilities.medium}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-yellow-600 rounded-full" style={{width: '30%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Low</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-blue-600">{securityMetrics.vulnerabilities.low}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-blue-600 rounded-full" style={{width: '70%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Security Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest security incidents and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSecurityEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(event.resolved)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getSeverityBadge(event.severity)}
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{event.description}</p>
                      <p className="text-xs text-gray-600 capitalize">Type: {event.type.replace('_', ' ')}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threat Management */}
        <TabsContent value="threats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Threat Detection</CardTitle>
              <CardDescription>Configure and monitor threat detection systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Threats Detected</h3>
                    <p className="text-gray-600">All systems are secure and operating normally</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control */}
        <TabsContent value="access" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Settings</CardTitle>
                <CardDescription>Configure platform-wide authentication policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Require 2FA for Admins</Label>
                      <p className="text-xs text-gray-600">Force two-factor authentication for platform administrators</p>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Password Complexity</Label>
                      <p className="text-xs text-gray-600">Enforce strong password requirements</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Session Timeout</Label>
                      <p className="text-xs text-gray-600">Automatic session expiration</p>
                    </div>
                    <Button variant="outline" size="sm">24 hours</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Permissions</CardTitle>
                <CardDescription>Manage platform-level access controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">API Rate Limiting</Label>
                      <p className="text-xs text-gray-600">Requests per minute per user</p>
                    </div>
                    <Button variant="outline" size="sm">1000/min</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">IP Whitelisting</Label>
                      <p className="text-xs text-gray-600">Restrict admin access to specific IPs</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Failed Login Lockout</Label>
                      <p className="text-xs text-gray-600">Lock accounts after failed attempts</p>
                    </div>
                    <Button variant="outline" size="sm">5 attempts</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>Real-time security monitoring and alerting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <Activity className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Intrusion Detection</p>
                  <p className="text-xs text-gray-600 mt-1">Active</p>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Activity Logging</p>
                  <p className="text-xs text-gray-600 mt-1">Enabled</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Anomaly Detection</p>
                  <p className="text-xs text-gray-600 mt-1">Learning</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Security Configuration</CardTitle>
              <CardDescription>Configure global security settings and policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="security-level">Security Level</Label>
                  <select
                    id="security-level"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="high" selected>High</option>
                    <option value="maximum">Maximum</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="encryption-key">Data Encryption</Label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <Input
                      type="password"
                      id="encryption-key"
                      placeholder="Current encryption key"
                      className="flex-1"
                      readOnly
                    />
                    <Button variant="outline" className="ml-2">
                      Rotate Key
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="audit-logging" checked readOnly />
                  <Label htmlFor="audit-logging">Enable comprehensive audit logging</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="breach-detection" checked readOnly />
                  <Label htmlFor="breach-detection">Enable breach detection alerts</Label>
                </div>

                <div className="pt-4">
                  <Button>Save Security Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}