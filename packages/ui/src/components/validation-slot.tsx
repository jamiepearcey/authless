import { AlertCircle, Info, CheckCircle } from "lucide-react";
import clsx from "clsx";

type Props = {
  state?: "error" | "success" | "hint";
  error?: string;
  success?: string;
  hint?: string;
};

export function ValidationSlot({ state = "hint", error, success, hint = " " }: Props) {

  const icon = {
    error: <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />,
    success: <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />,
    hint: <Info className="h-4 w-4 shrink-0 text-slate-300 mt-0.5" aria-hidden />,
  }[state];

  const textColor = {
    error: "text-red-800",
    success: "text-green-800",
    hint: "text-slate-800",
  }[state];

  const bg = {
    error: "bg-red-50 border-red-200",
    success: "bg-green-50 border-green-200",
    hint: "border-transparent",
  }[state];

  return (
    <div
      className={clsx("mt-2 rounded-md p-3 border transition-colors", bg)}
      role={state === "error" ? "alert" : undefined}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {icon}
        <p className={clsx("text-sm", textColor)}>
          {error || success || hint}
        </p>
      </div>
    </div>
  );
}