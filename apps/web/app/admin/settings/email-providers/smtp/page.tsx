"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea } from "@ui/base";
import { ArrowLeft, Mail, Server, Shield, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function SMTPProviderPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    enabled: false,
    host: "",
    port: 587,
    secure: true,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    connectionTimeout: 60000,
    socketTimeout: 60000,
    maxConnections: 5,
    rateLimitPerSecond: 14, // Most SMTP providers limit to ~14 emails/second
    // Advanced settings
    requireTLS: true,
    ignoreTLS: false,
    secure_: false,
    authMethod: "PLAIN" as "PLAIN" | "LOGIN" | "XOAUTH2",
    localAddress: "",
    name: "",
    version: "",
    // Debugging and logging
    debug: false,
    logger: false,
  });

  // Mock query for SMTP settings - replace with actual tRPC query
  const { data: smtpSettings, refetch } = trpc.getSMTPSettings?.useQuery() || { data: null, refetch: () => {} };

  // Mock mutation for updating SMTP settings
  const updateSettings = trpc.updateSMTPSettings?.useMutation({
    onSuccess: () => {
      toast.success("SMTP settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update SMTP settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Mock mutation for testing SMTP connection
  const testConnection = trpc.testSMTPConnection?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("SMTP connection test successful!");
        setIsConnected(true);
        setLastTested(new Date());
      } else {
        toast.error(`SMTP test failed: ${result.error}`);
        setIsConnected(false);
      }
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
      setIsConnected(false);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Initialize form data when settings load
  useEffect(() => {
    if (smtpSettings && !isEditing) {
      setFormData({
        enabled: smtpSettings.enabled || false,
        host: smtpSettings.host || "",
        port: smtpSettings.port || 587,
        secure: smtpSettings.secure ?? true,
        username: smtpSettings.username || "",
        password: smtpSettings.password || "",
        fromName: smtpSettings.fromName || "",
        fromEmail: smtpSettings.fromEmail || "",
        replyToEmail: smtpSettings.replyToEmail || "",
        connectionTimeout: smtpSettings.connectionTimeout || 60000,
        socketTimeout: smtpSettings.socketTimeout || 60000,
        maxConnections: smtpSettings.maxConnections || 5,
        rateLimitPerSecond: smtpSettings.rateLimitPerSecond || 14,
        requireTLS: smtpSettings.requireTLS ?? true,
        ignoreTLS: smtpSettings.ignoreTLS || false,
        secure_: smtpSettings.secure_ || false,
        authMethod: smtpSettings.authMethod || "PLAIN",
        localAddress: smtpSettings.localAddress || "",
        name: smtpSettings.name || "",
        version: smtpSettings.version || "",
        debug: smtpSettings.debug || false,
        logger: smtpSettings.logger || false,
      });
      setIsConnected(smtpSettings.isConnected || false);
      setLastTested(smtpSettings.lastTested ? new Date(smtpSettings.lastTested) : null);
    }
  }, [smtpSettings, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync(formData);
    } catch (error) {
      // Handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/admin/settings"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Settings
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <BreadcrumbNavigation
                items={[
                  { label: "Admin", href: "/admin" },
                  { label: "Settings", href: "/admin/settings" },
                  { label: "SMTP Provider", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Server className="h-8 w-8 text-indigo-600" />
              <span>SMTP Email Provider</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure SMTP server settings for email delivery
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Not Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  Status: {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {lastTested && (
                <p className="text-sm text-gray-600 mt-1">
                  Last tested: {lastTested.toLocaleString()}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
          <CardDescription>Essential SMTP server settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enabled">Enable SMTP provider</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">SMTP Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="port">SMTP Port *</Label>
                <Input
                  id="port"
                  type="number"
                  min="1"
                  max="65535"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="your-email@gmail.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Authless Support"
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="noreply@authless.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="replyToEmail">Reply-To Email</Label>
              <Input
                id="replyToEmail"
                type="email"
                value={formData.replyToEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, replyToEmail: e.target.value }))}
                disabled={!isEditing}
                placeholder="support@authless.com"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="secure"
                checked={formData.secure}
                onChange={(e) => setFormData(prev => ({ ...prev, secure: e.target.checked }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="secure">Use SSL/TLS encryption</Label>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
          <CardDescription>Advanced SMTP and performance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxConnections">Max Connections</Label>
                <Input
                  id="maxConnections"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxConnections}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxConnections: parseInt(e.target.value) || 5 }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="rateLimitPerSecond">Rate Limit (emails/sec)</Label>
                <Input
                  id="rateLimitPerSecond"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.rateLimitPerSecond}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerSecond: parseInt(e.target.value) || 14 }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="authMethod">Authentication Method</Label>
                <select
                  id="authMethod"
                  value={formData.authMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, authMethod: e.target.value as any }))}
                  disabled={!isEditing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="PLAIN">PLAIN</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="XOAUTH2">XOAUTH2</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="connectionTimeout">Connection Timeout (ms)</Label>
                <Input
                  id="connectionTimeout"
                  type="number"
                  min="1000"
                  max="300000"
                  value={formData.connectionTimeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) || 60000 }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="socketTimeout">Socket Timeout (ms)</Label>
                <Input
                  id="socketTimeout"
                  type="number"
                  min="1000"
                  max="300000"
                  value={formData.socketTimeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, socketTimeout: parseInt(e.target.value) || 60000 }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireTLS"
                  checked={formData.requireTLS}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireTLS: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requireTLS">Require TLS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ignoreTLS"
                  checked={formData.ignoreTLS}
                  onChange={(e) => setFormData(prev => ({ ...prev, ignoreTLS: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="ignoreTLS">Ignore TLS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="debug"
                  checked={formData.debug}
                  onChange={(e) => setFormData(prev => ({ ...prev, debug: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="debug">Enable debug logging</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Configuration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}