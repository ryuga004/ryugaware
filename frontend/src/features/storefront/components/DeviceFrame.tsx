"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";

export type Device = "desktop" | "tablet" | "mobile";

/** Real widths rather than a scaled-down screenshot: the storefront is responsive, so it simply reflows. */
const WIDTH: Record<Device, string> = { desktop: "100%", tablet: "834px", mobile: "390px" };

export function DeviceSwitcher({ value, onChange, className }: { value: Device; onChange: (value: Device) => void; className?: string }) {
  return (
    <SegmentedControl
      ariaLabel="Preview width"
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: "desktop", label: <Monitor className="size-4" aria-hidden />, ariaLabel: "Desktop" },
        { value: "tablet", label: <Tablet className="size-4" aria-hidden />, ariaLabel: "Tablet" },
        { value: "mobile", label: <Smartphone className="size-4" aria-hidden />, ariaLabel: "Mobile" },
      ]}
    />
  );
}

export function DeviceFrame({ device, children, className }: { device: Device; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("h-full overflow-y-auto overscroll-contain bg-subtle", className)}>
      <div
        className={cn("mx-auto min-h-full bg-surface", device !== "desktop" && "border-x border-line")}
        style={{ width: WIDTH[device], maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
