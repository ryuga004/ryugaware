import Image from "next/image";
import { Clock, EyeOff, Mail, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { VISIBILITY_LABELS } from "../constants";
import { formatAddress, formatPhone, normalisePhone } from "../schemas";
import type { ContactInput } from "../types";

type Partial2<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

/** Live footer preview, fed by useWatch so it follows every keystroke. */
export function ContactPreview({ values, title }: { values: Partial2<ContactInput>; title: string }) {
  const v = values;
  const phone = normalisePhone(v.phone ?? "");
  const whatsapp = v.whatsappSameAsPhone ? phone : normalisePhone(v.whatsapp ?? "");
  const address = formatAddress({
    addressLine1: v.addressLine1 ?? "",
    addressLine2: v.addressLine2 ?? "",
    city: v.city ?? "",
    state: v.state ?? "",
    pinCode: v.pinCode ?? "",
  });
  const lines: { icon: React.ReactNode; text: string; label: string }[] = [
    { icon: <Mail className="size-4" />, text: v.supportEmail?.trim() ?? "", label: "Email" },
    { icon: <Phone className="size-4" />, text: phone ? formatPhone(phone) : "", label: "Phone" },
    { icon: <MessageCircle className="size-4" />, text: whatsapp ? `WhatsApp ${formatPhone(whatsapp)}` : "", label: "WhatsApp" },
    { icon: <MapPin className="size-4" />, text: address, label: "Address" },
    { icon: <Clock className="size-4" />, text: v.supportHours?.trim() ?? "", label: "Support hours" },
    { icon: <UserRound className="size-4" />, text: v.contactPerson?.trim() ? `Contact: ${v.contactPerson.trim()}` : "", label: "Contact person" },
  ].filter((l) => l.text);
  const footerOn = v.show?.footer !== false;

  return (
    <section aria-labelledby="contact-preview-title" className="rounded-card border border-line bg-surface p-5">
      <h2 id="contact-preview-title" className="font-heading text-base font-semibold text-ink">
        Preview
      </h2>
      <p className="text-sm text-muted">How it appears in your store footer</p>

      <div className={cn("mt-4 overflow-hidden rounded-lg bg-[#F9ECEE] transition-opacity", !footerOn && "opacity-50")}>
        <Image src="/images/contact/map.webp" alt="" width={1488} height={400} sizes="(min-width: 1024px) 300px, calc(100vw - 72px)" className="h-auto w-full" />
        <div className="p-5">
          <p className="font-heading text-xl font-semibold break-words text-[#7C3A55]">{title}</p>
          {lines.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Your contact details will appear here.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {lines.map((l) => (
                <li key={l.label} className="flex items-start gap-2.5 text-[13px] text-[#2B1B22]">
                  <span className="mt-0.5 shrink-0 text-[#7C3A55]" aria-hidden>
                    {l.icon}
                  </span>
                  <span className="sr-only">{l.label}: </span>
                  <span className="min-w-0 break-words">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!footerOn && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <EyeOff className="size-3.5" aria-hidden /> Hidden from the footer.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted">Shown on:</span>
        {VISIBILITY_LABELS.filter((x) => v.show?.[x.key]).map((x) => (
          <Badge key={x.key}>{x.title}</Badge>
        ))}
        {!VISIBILITY_LABELS.some((x) => v.show?.[x.key]) && <span className="text-xs font-medium text-ink">Nowhere yet</span>}
      </div>
    </section>
  );
}
