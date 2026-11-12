import Image from "next/image";
import { cn } from "@/lib/cn";
import { DELIVERY_TYPE_LABEL, carrierMark, typeMark } from "../constants";
import type { DeliveryType } from "../types";

/** Small 3:2 artwork tile for a delivery type, or for a carrier when `carrier` is given. */
export function DeliveryMark({ type, carrier, size = "md", className }: { type: DeliveryType; carrier?: string; size?: "sm" | "md"; className?: string }) {
  const src = carrier ? carrierMark(carrier, type) : typeMark(type);
  const w = size === "md" ? 54 : 42;
  return (
    <Image
      src={src}
      alt=""
      title={carrier ?? DELIVERY_TYPE_LABEL[type]}
      width={w}
      height={(w * 2) / 3}
      className={cn("shrink-0 rounded-md border border-line bg-surface", className)}
    />
  );
}
