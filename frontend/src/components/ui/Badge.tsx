import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "ember" | "ink";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-subtle border-line text-ink-700",
  success: "bg-success-bg border-success-border text-success",
  warning: "bg-warning-bg border-warning-border text-warning-text",
  danger: "bg-danger-bg border-danger-border text-danger-hover",
  ember: "bg-tint border-[#f3c3b2] text-primary",
  ink: "bg-ink border-ink text-page",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}
