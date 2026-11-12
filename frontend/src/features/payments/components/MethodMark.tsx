import Image from "next/image";
import { cn } from "@/lib/cn";
import { PAYMENT_TYPE } from "../constants";
import type { PaymentType } from "../types";

/** Payment type artwork (192×128 source) shown at 48×32 in rows and cards. Decorative: the name sits beside it. */
export function MethodMark({ type, className }: { type: PaymentType; className?: string }) {
  return (
    <Image
      src={PAYMENT_TYPE[type].mark}
      alt=""
      width={48}
      height={32}
      className={cn("h-8 w-12 shrink-0 rounded-md border border-line bg-subtle object-cover", className)}
    />
  );
}
