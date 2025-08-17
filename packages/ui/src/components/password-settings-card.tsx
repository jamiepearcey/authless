"use client";

import React, { useMemo, useState } from "react";
import { Lock, CheckCircle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

type PasswordSettingsCardProps = {
  onChangePassword: (payload: { current: string; next: string }) => Promise<void> | void;
  minLength?: number;
  heightClass?: string; // fixed size wrapper (e.g., "h-72"). Defaults provided.
};

export function PasswordSettingsCard({
  onChangePassword,
  minLength = 8,
  heightClass = "h-72 sm:h-80",
}: PasswordSettingsCardProps) {
  const [mode, setMode] = useState<"landing" | "editing" | "success">("landing");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSaving) return false;
    if (!current || !next || !confirm) return false;
    if (next.length < minLength) return false;
    if (next !== confirm) return false;
    return true;
  }, [current, next, confirm, minLength, isSaving]);

  const handleStart = () => {
    setMode("editing");
    setError(undefined);
    setSuccess(undefined);
  };

  const handleCancel = () => {
    setMode("landing");
    setError(undefined);
    setSuccess(undefined);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (next.length < minLength) {
      setError(`Password must be at least ${minLength} characters.`);
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setIsSaving(true);
      await onChangePassword({ current, next });
      setIsSaving(false);
      setSuccess("Your password has been changed.");
      setMode("success");
      // clear sensitive fields after success
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setIsSaving(false);
      setError(err?.message || "Unable to change password. Please try again.");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Fixed-height inner to prevent layout shift */}
      <div className={clsx("relative overflow-hidden px-4 py-5 sm:p-6", heightClass)}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg leading-6 font-medium text-gray-900">Change Password</h3>
        </div>

        {/* Panels are absolutely stacked; we toggle with opacity/transform so the box never resizes */}
        <div className="relative h-full">
          {/* Landing Panel */}
          <Panel visible={mode === "landing"}>
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MaskDots />
              <p className="mt-3 text-sm text-gray-600">
                Your password is protected. Click below to update it.
              </p>

              <div className="mt-6">
                <Button onClick={handleStart}>Change Password</Button>
              </div>
            </div>
          </Panel>

          {/* Editing Panel */}
          <Panel visible={mode === "editing"}>
            <form onSubmit={handleSubmit} className="grid grid-rows-[1fr_auto] h-full">
              <div className="space-y-4">
                <Field
                  id="currentPassword"
                  label="Current Password"
                  type="password"
                  value={current}
                  onChange={setCurrent}
                  autoFocus
                />
                <Field
                  id="newPassword"
                  label="New Password"
                  type="password"
                  value={next}
                  onChange={setNext}
                  hint={`Must be at least ${minLength} characters`}
                />
                <Field
                  id="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                />

                <ValidationSlot
                  error={
                    error ||
                    (next && next.length < minLength
                      ? `Password must be at least ${minLength} characters.`
                      : undefined) ||
                    (confirm && next !== confirm ? "Passwords do not match." : undefined)
                  }
                  hint="Use a phrase with numbers & symbols."
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit} loading={isSaving}>
                  {isSaving ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </form>
          </Panel>

          {/* Success Panel */}
          <Panel visible={mode === "success"}>
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="mt-3 text-sm text-green-800">
                {success || "Your password has been changed."}
              </p>
              <div className="mt-6">
                <Button onClick={() => setMode("landing")} variant="outline">
                  Done
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Masked password glyphs, clean + stylish */
function MaskDots() {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
        />
      ))}
    </div>
  );
}

/** Overlaid panel with fade/slide */
function Panel({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "absolute inset-0 transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      {children}
    </div>
  );
}

/** Small field primitive */
function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  hint,
  autoFocus,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/** Validation slot that keeps height stable and switches state */
function ValidationSlot({ error, hint }: { error?: string; hint?: string }) {
  const state = error ? "error" : "hint";
  const icon =
    state === "error" ? (
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
    ) : (
      <Info className="h-4 w-4 shrink-0 text-slate-300 mt-0.5" aria-hidden />
    );

  const bg =
    state === "error" ? "bg-red-50 border-red-200" : "border-transparent";
  const text = state === "error" ? "text-red-800" : "text-slate-600";

  return (
    <div
      className={clsx("rounded-md border p-3 transition-colors", bg)}
      role={state === "error" ? "alert" : undefined}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {icon}
        <p className={clsx("text-sm", text)}>{error || hint || " "}</p>
      </div>
    </div>
  );
}

/** Minimal button; swap for shadcn/ui Button if you prefer */
function Button({
  children,
  onClick,
  type = "button",
  disabled,
  loading,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  variant?: "solid" | "outline" | "ghost";
}) {
  const styles =
    variant === "solid"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
      : variant === "outline"
      ? "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 focus:ring-indigo-500"
      : "bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-slate-400";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
        styles
      )}
    >
      {loading && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      )}
      {children}
    </button>
  );
}