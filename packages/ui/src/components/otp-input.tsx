"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  name?: string;
  ariaLabel?: string;
  isInvalid?: boolean;
  className?: string;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  disabled,
  name,
  ariaLabel = "Authentication code",
  isInvalid,
  className,
}: Props) {
  // ❗️Init internal with repeat, not padEnd("")
  const [internal, setInternal] = useState<string>("".repeat(length));

  // normalize external/internal -> digits only, max length
  const normalized = useMemo(() => {
    const v = (value ?? internal).replace(/\D+/g, "").slice(0, length);
    return v;
  }, [value, internal, length]);

  // Always render N cells regardless of value length
  const displayed = useMemo(
    () => Array.from({ length }, (_, i) => normalized[i] ?? ""),
    [normalized, length]
  );

  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  if (inputs.current.length !== length) inputs.current = Array(length).fill(null);

  const focusIndex = (i: number) => inputs.current[i]?.focus();

  const update = (nextDigits: string) => {
    onChange?.(nextDigits);
    if (value === undefined) setInternal(nextDigits);
    // ✅ Build regex dynamically to check completion
    if (onComplete && new RegExp(`^\\d{${length}}$`).test(nextDigits)) {
      onComplete(nextDigits);
    }
  };

  useEffect(() => {
    if (autoFocus && !disabled) {
      const t = setTimeout(() => focusIndex(0), 0);
      return () => clearTimeout(t);
    }
  }, [autoFocus, disabled]);

  const onInput = (i: number) => (e: React.FormEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value.replace(/\D+/g, "");
    if (!raw) {
      // clear current
      const arr = [...displayed];
      arr[i] = "";
      update(arr.join(""));
      return;
    }

    // Paste or multi-char entry
    if (raw.length > 1) {
      const arr = [...displayed];
      for (let k = 0; k < raw.length && i + k < length; k++) {
        arr[i + k] = raw[k];
      }
      const next = arr.join("");
      update(next);
      focusIndex(Math.min(i + raw.length, length - 1));
      return;
    }

    // Single digit
    const arr = [...displayed];
    arr[i] = raw;
    const next = arr.join("");
    update(next);
    if (i < length - 1) focusIndex(i + 1);
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    const arr = [...displayed];

    const isDigit = /^[0-9]$/.test(key);
    const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];

    if (!isDigit && !allowed.includes(key)) {
      e.preventDefault();
      return;
    }

    if (isDigit) {
      arr[i] = key;
      update(arr.join(""));
      if (i < length - 1) {
        requestAnimationFrame(() => {
          focusIndex(i + 1);
          inputs.current[i + 1]?.select();
        });
      } else {
        requestAnimationFrame(() => inputs.current[i]?.select());
      }
      e.preventDefault();
      return;
    }

    if (key === "Backspace") {
      if (arr[i]) {
        arr[i] = "";
        update(arr.join(""));
      } else if (i > 0) {
        focusIndex(i - 1);
        const j = i - 1;
        const arr2 = [...displayed];
        arr2[j] = "";
        update(arr2.join(""));
      }
      e.preventDefault();
    }

    if (key === "ArrowLeft" && i > 0) {
      focusIndex(i - 1);
      e.preventDefault();
    }
    if (key === "ArrowRight" && i < length - 1) {
      focusIndex(i + 1);
      e.preventDefault();
    }
  };

  const onPaste = (i: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D+/g, "");
    if (!text) return;
    e.preventDefault();
    const arr = [...displayed];
    for (let k = 0; k < text.length && i + k < length; k++) {
      arr[i + k] = text[k];
    }
    update(arr.join(""));
    focusIndex(Math.min(i + text.length, length - 1));
  };

  return (
    <div className={className} aria-label={ariaLabel} role="group" aria-disabled={disabled}>
      {/* form value */}
      <input type="hidden" name={name} value={normalized} />
      <div className="flex items-center gap-2">
        {displayed.map((ch, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1}`}
            aria-invalid={isInvalid || undefined}
            disabled={disabled}
            className={[
              "w-10 h-12 text-center text-lg font-medium",
              "rounded-md border outline-none",
              isInvalid
                ? "border-red-300 focus:ring-2 focus:ring-red-500/30"
                : "border-slate-300 focus:ring-2 focus:ring-slate-500/30",
              disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white",
            ].join(" ")}
            value={ch}
            onChange={() => {}}
            onInput={onInput(i)}
            onKeyDown={onKeyDown(i)}
            onPaste={onPaste(i)}
            maxLength={1}
          />
        ))}
      </div>
    </div>
  );
}