"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { Badge } from "@ui/base";
import { Shield, Eye, Settings, Play } from "lucide-react";
import TwoFactorPrompt from "@/components/TwoFactorPrompt";
import TwoFactorPromptConfig from "@/components/TwoFactorPromptConfig";
import TwoFactorGate from "@/components/TwoFactorGate";

export default function TwoFactorPromptingDemo() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showInline, setShowInline] = useState(false);
  const [showSensitiveAction, setShowSensitiveAction] = useState(false);

  const [config, setConfig] = useState({
    enforceAfterDays: 7,
    showReminders: true,
    reminderIntervalHours: 24,
  });

  const handleConfigChange = (newConfig: typeof config) => {
    setConfig(newConfig);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Two-Factor Authentication Prompting System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive system for encouraging and enforcing 2FA enrollment with configurable prompts, reminders, and enforcement policies.
          </p>
        </div>

        <Tabs defaultValue="demo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demo">Demo & Testing</TabsTrigger>
            <TabsTrigger value="variants">Prompt Variants</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          {/* Demo & Testing Tab */}
          <TabsContent value="demo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Interactive Demo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Test different 2FA prompting scenarios. These demos simulate various states and configurations.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowBanner(!showBanner)}
                    variant={showBanner ? "destructive" : "default"}
                    className="w-full"
                  >
                    {showBanner ? "Hide" : "Show"} Banner Prompt
                  </Button>
                  
                  <Button
                    onClick={() => setShowModal(!showModal)}
                    variant={showModal ? "destructive" : "default"}
                    className="w-full"
                  >
                    {showModal ? "Hide" : "Show"} Modal Prompt
                  </Button>
                  
                  <Button
                    onClick={() => setShowInline(!showInline)}
                    variant={showInline ? "destructive" : "default"}
                    className="w-full"
                  >
                    {showInline ? "Hide" : "Show"} Inline Prompt
                  </Button>
                  
                  <Button
                    onClick={() => setShowSensitiveAction(!showSensitiveAction)}
                    variant={showSensitiveAction ? "destructive" : "default"}
                    className="w-full"
                  >
                    {showSensitiveAction ? "Hide" : "Show"} Sensitive Action Gate
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Demo Prompts */}
            {showBanner && (
              <TwoFactorPrompt
                variant="banner"
                enforceAfter={config.enforceAfterDays}
                showReminders={config.showReminders}
                reminderInterval={config.reminderIntervalHours}
              />
            )}

            {showModal && (
              <TwoFactorPrompt
                variant="modal"
                enforceAfter={config.enforceAfterDays}
                showReminders={config.showReminders}
                reminderInterval={config.reminderIntervalHours}
              />
            )}

            {showInline && (
              <TwoFactorPrompt
                variant="inline"
                enforceAfter={config.enforceAfterDays}
                showReminders={config.showReminders}
                reminderInterval={config.reminderIntervalHours}
              />
            )}

            {showSensitiveAction && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="text-red-700">Sensitive Action Demo</CardTitle>
                </CardHeader>
                <CardContent>
                  <TwoFactorGate action="this demo action">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        ✅ This content would be visible if 2FA was set up. Since it's not, the 2FA gate is blocking access.
                      </p>
                    </div>
                  </TwoFactorGate>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Prompt Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Banner Variant */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Banner Variant
                  </CardTitle>
                  <Badge variant="secondary">Default</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    A subtle banner that appears at the top of the page. Perfect for non-intrusive reminders.
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div>• Appears at page top</div>
                    <div>• Non-blocking</div>
                    <div>• Easy to dismiss</div>
                    <div>• Good for reminders</div>
                  </div>
                  <Button
                    onClick={() => setShowBanner(true)}
                    size="sm"
                    className="w-full"
                  >
                    Try Banner
                  </Button>
                </CardContent>
              </Card>

              {/* Modal Variant */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Modal Variant
                  </CardTitle>
                  <Badge variant="default">Enforcement</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    A modal dialog that requires user attention. Best for mandatory 2FA setup or sensitive actions.
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div>• Full-screen overlay</div>
                    <div>• Requires action</div>
                    <div>• Cannot be dismissed</div>
                    <div>• Good for enforcement</div>
                  </div>
                  <Button
                    onClick={() => setShowModal(true)}
                    size="sm"
                    className="w-full"
                  >
                    Try Modal
                  </Button>
                </CardContent>
              </Card>

              {/* Inline Variant */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Inline Variant
                  </CardTitle>
                  <Badge variant="outline">Contextual</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    An inline component that fits naturally within page content. Great for contextual prompts.
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div>• Fits in content flow</div>
                    <div>• Contextual placement</div>
                    <div>• Easy to integrate</div>
                    <div>• Good for forms/pages</div>
                  </div>
                  <Button
                    onClick={() => setShowInline(true)}
                    size="sm"
                    className="w-full"
                  >
                    Try Inline
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Usage Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Banner for General Reminders</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<TwoFactorPrompt
  variant="banner"
  enforceAfter={7}
  showReminders={true}
  reminderInterval={24}
/>`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Modal for Enforcement</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<TwoFactorPrompt
  variant="modal"
  enforceAfter={0}
  showReminders={false}
  sensitiveAction={true}
/>`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Inline for Contextual Prompts</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`<TwoFactorPrompt
  variant="inline"
  enforceAfter={7}
  showReminders={true}
  reminderInterval={12}
/>`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config">
            <TwoFactorPromptConfig />
          </TabsContent>
        </Tabs>

        {/* Show active prompts */}
        {showBanner && (
          <TwoFactorPrompt
            variant="banner"
            enforceAfter={config.enforceAfterDays}
            showReminders={config.showReminders}
            reminderInterval={config.reminderIntervalHours}
          />
        )}

        {showModal && (
          <TwoFactorPrompt
            variant="modal"
            enforceAfter={config.enforceAfterDays}
            showReminders={config.showReminders}
            reminderInterval={config.reminderIntervalHours}
          />
        )}

        {showInline && (
          <TwoFactorPrompt
            variant="inline"
            enforceAfter={config.enforceAfterDays}
            showReminders={config.showReminders}
            reminderInterval={config.reminderIntervalHours}
          />
        )}
      </div>
    </div>
  );
}
