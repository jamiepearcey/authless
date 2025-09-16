"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { ArrowLeft, Mail, Zap, Shield, CheckCircle, XCircle, Eye, EyeOff, ExternalLink, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function JetStreamProviderPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    apiKey: "",
    domain: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    // JetStream specific settings
    streamName: "EMAIL_EVENTS",
    consumerName: "email-consumer",
    natsUrl: "nats://127.0.0.1:4222",
    // Connection settings
    connectionTimeout: 5000,
    requestTimeout: 30000,
    maxReconnectAttempts: 10,
    reconnectWait: 1000,
    // Stream configuration
    streamConfig: {
      subjects: ["email.send", "email.delivered", "email.bounced", "email.opened", "email.clicked"],
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      maxMsgs: 1000000,
      maxBytes: 1024 * 1024 * 1024, // 1GB
      retention: "limits" as "limits" | "interest" | "workqueue",
      storage: "file" as "file" | "memory",
      replicas: 1,
      duplicateWindow: 2 * 60 * 1000, // 2 minutes
    },
    // Consumer configuration
    consumerConfig: {
      deliverPolicy: "new" as "all" | "last" | "new" | "by_start_sequence" | "by_start_time",
      ackPolicy: "explicit" as "none" | "all" | "explicit",
      ackWait: 30 * 1000, // 30 seconds
      maxDeliver: 3,
      filterSubject: "email.*",
      replayPolicy: "instant" as "instant" | "original",
      sampleFreq: "",
      rateLimitBps: 0,
      maxAckPending: 1000,
      maxWaiting: 512,
      maxBatch: 100,
    },
    // Rate limiting and batching
    rateLimitPerSecond: 100,
    batchSize: 50,
    concurrency: 5,
    // Security and authentication
    credentials: {
      user: "",
      pass: "",
      token: "",
      nkey: "",
      jwt: "",
    },
    tls: {
      enabled: false,
      cert: "",
      key: "",
      ca: "",
      insecure: false,
    },
    // Monitoring and observability
    metrics: {
      enabled: true,
      port: 8080,
      path: "/metrics",
    },
    healthCheck: {
      enabled: true,
      port: 8081,
      path: "/health",
      interval: 30000, // 30 seconds
    },
    // Dead letter queue
    dlq: {
      enabled: true,
      maxRetries: 3,
      subject: "email.dlq",
    },
    // Email processing settings
    processing: {
      enableTemplating: true,
      enableTracking: true,
      enableRetries: true,
      defaultPriority: "normal" as "low" | "normal" | "high" | "urgent",
      maxTemplateSize: 1024 * 1024, // 1MB
    },
    // Logging and debugging
    logging: {
      level: "info" as "debug" | "info" | "warn" | "error",
      format: "json" as "json" | "text",
      enableRequestLogging: false,
    },
  });

  // Mock query for JetStream settings - replace with actual tRPC query
  const { data: jetstreamSettings, refetch } = trpc.getJetStreamSettings?.useQuery() || { data: null, refetch: () => {} };

  // Mock mutation for updating JetStream settings
  const updateSettings = trpc.updateJetStreamSettings?.useMutation({
    onSuccess: () => {
      toast.success("JetStream settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update JetStream settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Mock mutation for testing JetStream connection
  const testConnection = trpc.testJetStreamConnection?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("JetStream connection test successful!");
        setIsConnected(true);
        setLastTested(new Date());
      } else {
        toast.error(`JetStream test failed: ${result.error}`);
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
    if (jetstreamSettings && !isEditing) {
      setFormData({
        enabled: jetstreamSettings.enabled || false,
        apiKey: jetstreamSettings.apiKey || "",
        domain: jetstreamSettings.domain || "",
        fromName: jetstreamSettings.fromName || "",
        fromEmail: jetstreamSettings.fromEmail || "",
        replyToEmail: jetstreamSettings.replyToEmail || "",
        streamName: jetstreamSettings.streamName || "EMAIL_EVENTS",
        consumerName: jetstreamSettings.consumerName || "email-consumer",
        natsUrl: jetstreamSettings.natsUrl || "nats://127.0.0.1:4222",
        connectionTimeout: jetstreamSettings.connectionTimeout || 5000,
        requestTimeout: jetstreamSettings.requestTimeout || 30000,
        maxReconnectAttempts: jetstreamSettings.maxReconnectAttempts || 10,
        reconnectWait: jetstreamSettings.reconnectWait || 1000,
        streamConfig: jetstreamSettings.streamConfig || {
          subjects: ["email.send", "email.delivered", "email.bounced", "email.opened", "email.clicked"],
          maxAge: 7 * 24 * 60 * 60 * 1000,
          maxMsgs: 1000000,
          maxBytes: 1024 * 1024 * 1024,
          retention: "limits",
          storage: "file",
          replicas: 1,
          duplicateWindow: 2 * 60 * 1000,
        },
        consumerConfig: jetstreamSettings.consumerConfig || {
          deliverPolicy: "new",
          ackPolicy: "explicit",
          ackWait: 30 * 1000,
          maxDeliver: 3,
          filterSubject: "email.*",
          replayPolicy: "instant",
          sampleFreq: "",
          rateLimitBps: 0,
          maxAckPending: 1000,
          maxWaiting: 512,
          maxBatch: 100,
        },
        rateLimitPerSecond: jetstreamSettings.rateLimitPerSecond || 100,
        batchSize: jetstreamSettings.batchSize || 50,
        concurrency: jetstreamSettings.concurrency || 5,
        credentials: jetstreamSettings.credentials || {
          user: "", pass: "", token: "", nkey: "", jwt: ""
        },
        tls: jetstreamSettings.tls || {
          enabled: false, cert: "", key: "", ca: "", insecure: false
        },
        metrics: jetstreamSettings.metrics || {
          enabled: true, port: 8080, path: "/metrics"
        },
        healthCheck: jetstreamSettings.healthCheck || {
          enabled: true, port: 8081, path: "/health", interval: 30000
        },
        dlq: jetstreamSettings.dlq || {
          enabled: true, maxRetries: 3, subject: "email.dlq"
        },
        processing: jetstreamSettings.processing || {
          enableTemplating: true, enableTracking: true, enableRetries: true,
          defaultPriority: "normal", maxTemplateSize: 1024 * 1024
        },
        logging: jetstreamSettings.logging || {
          level: "info", format: "json", enableRequestLogging: false
        },
      });
      setIsConnected(jetstreamSettings.isConnected || false);
      setLastTested(jetstreamSettings.lastTested ? new Date(jetstreamSettings.lastTested) : null);
    }
  }, [jetstreamSettings, isEditing]);

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
                  { label: "JetStream Provider", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Activity className="h-8 w-8 text-green-600" />
              <span>JetStream Email Provider</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure JetStream for high-performance, event-driven email processing
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('https://docs.nats.io/jetstream', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                JetStream Docs
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
          <CardDescription>Essential JetStream connection settings</CardDescription>
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
              <Label htmlFor="enabled">Enable JetStream provider</Label>
            </div>

            <div>
              <Label htmlFor="natsUrl">NATS Server URL *</Label>
              <Input
                id="natsUrl"
                value={formData.natsUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, natsUrl: e.target.value }))}
                disabled={!isEditing}
                placeholder="nats://127.0.0.1:4222"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apiKey">JetStream API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="js_xxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="yourdomain.com"
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
          </form>
        </CardContent>
      </Card>

      {/* Stream Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Stream Configuration</CardTitle>
          <CardDescription>JetStream stream settings for email events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="streamName">Stream Name</Label>
                <Input
                  id="streamName"
                  value={formData.streamName}
                  onChange={(e) => setFormData(prev => ({ ...prev, streamName: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="EMAIL_EVENTS"
                />
              </div>
              <div>
                <Label htmlFor="consumerName">Consumer Name</Label>
                <Input
                  id="consumerName"
                  value={formData.consumerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, consumerName: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="email-consumer"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subjects">Stream Subjects (comma-separated)</Label>
              <Input
                id="subjects"
                value={formData.streamConfig.subjects.join(", ")}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  streamConfig: {
                    ...prev.streamConfig,
                    subjects: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                  }
                }))}
                disabled={!isEditing}
                placeholder="email.send, email.delivered, email.bounced"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxMsgs">Max Messages</Label>
                <Input
                  id="maxMsgs"
                  type="number"
                  min="1000"
                  value={formData.streamConfig.maxMsgs}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    streamConfig: {
                      ...prev.streamConfig,
                      maxMsgs: parseInt(e.target.value) || 1000000
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="maxAge">Max Age (days)</Label>
                <Input
                  id="maxAge"
                  type="number"
                  min="1"
                  max="365"
                  value={Math.floor(formData.streamConfig.maxAge / (24 * 60 * 60 * 1000))}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    streamConfig: {
                      ...prev.streamConfig,
                      maxAge: (parseInt(e.target.value) || 7) * 24 * 60 * 60 * 1000
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="replicas">Replicas</Label>
                <Input
                  id="replicas"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.streamConfig.replicas}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    streamConfig: {
                      ...prev.streamConfig,
                      replicas: parseInt(e.target.value) || 1
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retention">Retention Policy</Label>
                <Select 
                  value={formData.streamConfig.retention} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    streamConfig: {
                      ...prev.streamConfig,
                      retention: value as any
                    }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limits">Limits</SelectItem>
                    <SelectItem value="interest">Interest</SelectItem>
                    <SelectItem value="workqueue">Work Queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="storage">Storage Type</Label>
                <Select 
                  value={formData.streamConfig.storage} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    streamConfig: {
                      ...prev.streamConfig,
                      storage: value as any
                    }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">File</SelectItem>
                    <SelectItem value="memory">Memory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consumer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Consumer Configuration</CardTitle>
          <CardDescription>JetStream consumer settings for message processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliverPolicy">Deliver Policy</Label>
                <Select 
                  value={formData.consumerConfig.deliverPolicy} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    consumerConfig: {
                      ...prev.consumerConfig,
                      deliverPolicy: value as any
                    }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="last">Last</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="by_start_sequence">By Start Sequence</SelectItem>
                    <SelectItem value="by_start_time">By Start Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ackPolicy">Acknowledgment Policy</Label>
                <Select 
                  value={formData.consumerConfig.ackPolicy} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    consumerConfig: {
                      ...prev.consumerConfig,
                      ackPolicy: value as any
                    }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="explicit">Explicit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxDeliver">Max Deliver Attempts</Label>
                <Input
                  id="maxDeliver"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.consumerConfig.maxDeliver}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    consumerConfig: {
                      ...prev.consumerConfig,
                      maxDeliver: parseInt(e.target.value) || 3
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="ackWait">Ack Wait (seconds)</Label>
                <Input
                  id="ackWait"
                  type="number"
                  min="1"
                  max="300"
                  value={Math.floor(formData.consumerConfig.ackWait / 1000)}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    consumerConfig: {
                      ...prev.consumerConfig,
                      ackWait: (parseInt(e.target.value) || 30) * 1000
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="maxBatch">Max Batch Size</Label>
                <Input
                  id="maxBatch"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.consumerConfig.maxBatch}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    consumerConfig: {
                      ...prev.consumerConfig,
                      maxBatch: parseInt(e.target.value) || 100
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filterSubject">Filter Subject</Label>
              <Input
                id="filterSubject"
                value={formData.consumerConfig.filterSubject}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  consumerConfig: {
                    ...prev.consumerConfig,
                    filterSubject: e.target.value
                  }
                }))}
                disabled={!isEditing}
                placeholder="email.*"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance & Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Performance & Rate Limiting</CardTitle>
          <CardDescription>Processing performance and rate limiting settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rateLimitPerSecond">Rate Limit (emails/sec)</Label>
                <Input
                  id="rateLimitPerSecond"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.rateLimitPerSecond}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerSecond: parseInt(e.target.value) || 100 }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.batchSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 50 }))}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="concurrency">Concurrency Level</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.concurrency}
                  onChange={(e) => setFormData(prev => ({ ...prev, concurrency: parseInt(e.target.value) || 5 }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Features */}
      <Card>
        <CardHeader>
          <CardTitle>Email Processing Features</CardTitle>
          <CardDescription>Advanced email processing and templating features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableTemplating"
                  checked={formData.processing.enableTemplating}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    processing: { 
                      ...prev.processing, 
                      enableTemplating: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="enableTemplating">Enable email templating</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableTracking"
                  checked={formData.processing.enableTracking}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    processing: { 
                      ...prev.processing, 
                      enableTracking: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="enableTracking">Enable email tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableRetries"
                  checked={formData.processing.enableRetries}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    processing: { 
                      ...prev.processing, 
                      enableRetries: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="enableRetries">Enable automatic retries</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultPriority">Default Priority</Label>
                <Select 
                  value={formData.processing.defaultPriority} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    processing: {
                      ...prev.processing,
                      defaultPriority: value as any
                    }
                  }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maxTemplateSize">Max Template Size (KB)</Label>
                <Input
                  id="maxTemplateSize"
                  type="number"
                  min="1"
                  max="10240"
                  value={Math.floor(formData.processing.maxTemplateSize / 1024)}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    processing: {
                      ...prev.processing,
                      maxTemplateSize: (parseInt(e.target.value) || 1024) * 1024
                    }
                  }))}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dead Letter Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Dead Letter Queue (DLQ)</CardTitle>
          <CardDescription>Failed message handling and retry configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dlqEnabled"
                checked={formData.dlq.enabled}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  dlq: { 
                    ...prev.dlq, 
                    enabled: e.target.checked 
                  }
                }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="dlqEnabled">Enable Dead Letter Queue</Label>
            </div>

            {formData.dlq.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.dlq.maxRetries}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      dlq: {
                        ...prev.dlq,
                        maxRetries: parseInt(e.target.value) || 3
                      }
                    }))}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="dlqSubject">DLQ Subject</Label>
                  <Input
                    id="dlqSubject"
                    value={formData.dlq.subject}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      dlq: {
                        ...prev.dlq,
                        subject: e.target.value
                      }
                    }))}
                    disabled={!isEditing}
                    placeholder="email.dlq"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring & Observability */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring & Observability</CardTitle>
          <CardDescription>Metrics, health checks, and logging configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Metrics */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="metricsEnabled"
                  checked={formData.metrics.enabled}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    metrics: { 
                      ...prev.metrics, 
                      enabled: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="metricsEnabled">Enable metrics endpoint</Label>
              </div>
              
              {formData.metrics.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div>
                    <Label htmlFor="metricsPort">Metrics Port</Label>
                    <Input
                      id="metricsPort"
                      type="number"
                      min="1024"
                      max="65535"
                      value={formData.metrics.port}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        metrics: {
                          ...prev.metrics,
                          port: parseInt(e.target.value) || 8080
                        }
                      }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="metricsPath">Metrics Path</Label>
                    <Input
                      id="metricsPath"
                      value={formData.metrics.path}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        metrics: {
                          ...prev.metrics,
                          path: e.target.value
                        }
                      }))}
                      disabled={!isEditing}
                      placeholder="/metrics"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Health Check */}
            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="healthEnabled"
                  checked={formData.healthCheck.enabled}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    healthCheck: { 
                      ...prev.healthCheck, 
                      enabled: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="healthEnabled">Enable health check endpoint</Label>
              </div>
              
              {formData.healthCheck.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                  <div>
                    <Label htmlFor="healthPort">Health Port</Label>
                    <Input
                      id="healthPort"
                      type="number"
                      min="1024"
                      max="65535"
                      value={formData.healthCheck.port}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        healthCheck: {
                          ...prev.healthCheck,
                          port: parseInt(e.target.value) || 8081
                        }
                      }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="healthPath">Health Path</Label>
                    <Input
                      id="healthPath"
                      value={formData.healthCheck.path}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        healthCheck: {
                          ...prev.healthCheck,
                          path: e.target.value
                        }
                      }))}
                      disabled={!isEditing}
                      placeholder="/health"
                    />
                  </div>
                  <div>
                    <Label htmlFor="healthInterval">Check Interval (sec)</Label>
                    <Input
                      id="healthInterval"
                      type="number"
                      min="5"
                      max="300"
                      value={Math.floor(formData.healthCheck.interval / 1000)}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        healthCheck: {
                          ...prev.healthCheck,
                          interval: (parseInt(e.target.value) || 30) * 1000
                        }
                      }))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Logging */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="logLevel">Log Level</Label>
                  <Select 
                    value={formData.logging.level} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      logging: {
                        ...prev.logging,
                        level: value as any
                      }
                    }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="logFormat">Log Format</Label>
                  <Select 
                    value={formData.logging.format} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      logging: {
                        ...prev.logging,
                        format: value as any
                      }
                    }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-3">
                <input
                  type="checkbox"
                  id="enableRequestLogging"
                  checked={formData.logging.enableRequestLogging}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    logging: { 
                      ...prev.logging, 
                      enableRequestLogging: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="enableRequestLogging">Enable request logging</Label>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open('https://docs.nats.io/jetstream', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Documentation
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