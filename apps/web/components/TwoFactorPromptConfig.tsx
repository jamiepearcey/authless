"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Switch } from "@ui/base";
import { Separator } from "@ui/base";
import { Shield, Clock, Bell, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TwoFactorPromptSettings {
  enforceAfterDays: number;
  showReminders: boolean;
  reminderIntervalHours: number;
  gracePeriodDays: number;
  requireForSensitiveActions: boolean;
  sensitiveActions: string[];
}

export default function TwoFactorPromptConfig() {
  const [settings, setSettings] = useState<TwoFactorPromptSettings>({
    enforceAfterDays: 7,
    showReminders: true,
    reminderIntervalHours: 24,
    gracePeriodDays: 7,
    requireForSensitiveActions: true,
    sensitiveActions: [
      "account deletion",
      "password changes",
      "billing modifications",
      "admin role changes",
      "data export",
      "API key generation"
    ],
  });

  const [newAction, setNewAction] = useState("");

  // In a real implementation, you'd use tRPC mutations to save these settings
  const handleSave = () => {
    // Save settings to backend
    console.log("Saving 2FA prompt settings:", settings);
    // trpc.updateTwoFactorPromptConfig.mutate(settings);
  };

  const handleAddSensitiveAction = () => {
    if (newAction.trim() && !settings.sensitiveActions.includes(newAction.trim())) {
      setSettings(prev => ({
        ...prev,
        sensitiveActions: [...prev.sensitiveActions, newAction.trim()]
      }));
      setNewAction("");
    }
  };

  const handleRemoveSensitiveAction = (action: string) => {
    setSettings(prev => ({
      ...prev,
      sensitiveActions: prev.sensitiveActions.filter(a => a !== action)
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication Prompting Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grace Period Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Grace Period Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gracePeriod">Grace Period (days)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  min="0"
                  max="365"
                  value={settings.gracePeriodDays}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    gracePeriodDays: parseInt(e.target.value) || 0
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long users have to set up 2FA before it becomes mandatory
                </p>
              </div>
              
              <div>
                <Label htmlFor="enforceAfter">Enforce After (days)</Label>
                <Input
                  id="enforceAfter"
                  type="number"
                  min="0"
                  max="365"
                  value={settings.enforceAfterDays}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    enforceAfterDays: parseInt(e.target.value) || 0
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When to start enforcing 2FA (0 = immediately)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reminder Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Reminder Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showReminders">Show Reminder Prompts</Label>
                  <p className="text-sm text-gray-500">
                    Periodically remind users to set up 2FA
                  </p>
                </div>
                <Switch
                  id="showReminders"
                  checked={settings.showReminders}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    showReminders: checked
                  }))}
                />
              </div>
              
              {settings.showReminders && (
                <div>
                  <Label htmlFor="reminderInterval">Reminder Interval (hours)</Label>
                  <Input
                    id="reminderInterval"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.reminderIntervalHours}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      reminderIntervalHours: parseInt(e.target.value) || 24
                    }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often to show reminder prompts (1-168 hours)
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Sensitive Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sensitive Actions Requiring 2FA
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require 2FA for Sensitive Actions</Label>
                  <p className="text-sm text-gray-500">
                    Block sensitive actions until 2FA is set up
                  </p>
                </div>
                <Switch
                  checked={settings.requireForSensitiveActions}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    requireForSensitiveActions: checked
                  }))}
                />
              </div>
              
              {settings.requireForSensitiveActions && (
                <div className="space-y-3">
                  <Label>Configured Sensitive Actions</Label>
                  <div className="space-y-2">
                    {settings.sensitiveActions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <span className="text-sm">{action}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveSensitiveAction(action)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new sensitive action..."
                      value={newAction}
                      onChange={(e) => setNewAction(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddSensitiveAction}
                      disabled={!newAction.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Grace Period:</span>
              <span className="font-medium">{settings.gracePeriodDays} days</span>
            </div>
            <div className="flex justify-between">
              <span>Enforcement:</span>
              <span className="font-medium">
                {settings.enforceAfterDays === 0 ? "Immediate" : `After ${settings.enforceAfterDays} days`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Reminders:</span>
              <span className="font-medium">
                {settings.showReminders ? `Every ${settings.reminderIntervalHours} hours` : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sensitive Actions:</span>
              <span className="font-medium">
                {settings.requireForSensitiveActions ? `${settings.sensitiveActions.length} configured` : "Not required"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
