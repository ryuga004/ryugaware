import Image from "next/image";
import { cn } from "@/lib/cn";
import { DELIVERY_PARTNER, DELIVERY_TYPE_LABEL, partnerMark, typeMark } from "../constants";
import type { DeliveryPartner, DeliveryType } from "../types";

/** Small 3:2 artwork tile for a delivery type, or for a partner when `partner` is given. */
export function DeliveryMark({ type, partner, size = "md", className }: { type: DeliveryType; partner?: DeliveryPartner; size?: "sm" | "md"; className?: string }) {
  const src = partner ? partnerMark(partner, type) : typeMark(type);
  const w = size === "md" ? 54 : 42;
  return (
    <Image
      src={src}
      alt=""
      title={partner ? DELIVERY_PARTNER[partner].label : DELIVERY_TYPE_LABEL[type]}
      width={w}
      height={(w * 2) / 3}
      className={cn("shrink-0 rounded-md border border-line bg-surface", className)}
    />
  );
}
