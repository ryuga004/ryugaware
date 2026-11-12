import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { avatarSrc } from "../constants";
import type { Customer } from "../types";

/** Profile photo when the customer has one, initials otherwise. Decorative: the name is always shown next to it. */
export function CustomerAvatar({ customer, size = 32, className }: { customer: Pick<Customer, "name" | "avatar">; size?: 32 | 56; className?: string }) {
  if (!customer.avatar) return <Avatar name={customer.name} size={size} className={className} />;
  return <Image src={avatarSrc(customer.avatar)} alt="" width={size} height={size} className={cn("shrink-0 rounded-full bg-subtle object-cover", className)} style={{ width: size, height: size }} />;
}
