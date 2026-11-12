import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "error";

const STYLES: Record<AlertTone, { box: string; icon: React.ReactNode }> = {
  info: { box: "border-line bg-subtle text-ink", icon: <Info className="size-[18px] text-ink-700" aria-hidden /> },
  success: { box: "border-success-border bg-success-bg text-success", icon: <CircleCheck className="size-[18px]" aria-hidden /> },
  warning: { box: "border-warning-border bg-warning-bg text-warning-text", icon: <TriangleAlert className="size-[18px] text-warning" aria-hidden /> },
  error: { box: "border-danger-border bg-danger-bg text-danger-hover", icon: <CircleAlert className="size-[18px] text-danger" aria-hidden /> },
};

export function Alert({ tone = "info", children, action, className }: { tone?: AlertTone; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm", STYLES[tone].box, className)}>
      <span className="mt-px shrink-0">{STYLES[tone].icon}</span>
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}
