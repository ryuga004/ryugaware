"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { COVERAGE_LABEL, DELIVERY_TYPE_LABEL } from "@/features/delivery/constants";
import { PAYMENT_PROVIDER, PAYMENT_TYPE } from "@/features/payments/constants";
import type { StoreSettingsPatch, WebsiteDeliveryOption, WebsitePaymentOption, WebsiteStoreSettings } from "@/features/website-settings/types";
import { cn } from "@/lib/cn";
import { formatMoney, pluralize } from "@/lib/format";

export type StoreSection = "payments" | "delivery";

export interface StorePanelProps {
  settings: WebsiteStoreSettings | undefined;
  loading: boolean;
  update: (patch: StoreSettingsPatch) => void;
}

export const STORE_SECTIONS: { key: StoreSection; title: string; hint: string }[] = [
  { key: "payments", title: "Payments", hint: "How this website takes money" },
  { key: "delivery", title: "Delivery", hint: "How orders reach the customer" },
];

/** Short summary for the row in the editor's root list. */
export function storeSummary(section: StoreSection, settings: WebsiteStoreSettings | undefined) {
  if (!settings) return undefined;
  const options = section === "payments" ? settings.payments : settings.delivery;
  const on = options.filter((o) => o.selected).length;
  return `${on} of ${pluralize(options.length, section === "payments" ? "method" : "option")} on`;
}

const LAST_ONE = "This is the only one left. Switch another on first.";

const paymentHint = (option: WebsitePaymentOption) => {
  if (!option.enabledGlobally) return "Switched off in Payments, so it won’t appear at checkout";
  const provider = PAYMENT_PROVIDER[option.provider].label;
  if (option.type === "cod") return option.feeFixed > 0 ? `Collected by courier · ${formatMoney(option.feeFixed)} fee` : "Collected by courier";
  const fee = option.feePercent > 0 ? `${option.feePercent}% per payment` : "No gateway fee";
  return `${provider} · ${fee}`;
};

const deliveryHint = (option: WebsiteDeliveryOption) => {
  if (!option.enabledGlobally) return "Switched off in Delivery, so it won’t appear at checkout";
  const rate =
    option.rateType === "free"
      ? "Free"
      : option.rateType === "free_above" && option.freeAbove !== null
        ? `${formatMoney(option.price)}, free above ${formatMoney(option.freeAbove)}`
        : formatMoney(option.price);
  const days =
    option.type === "pickup"
      ? option.maxDays === 0
        ? "Ready today"
        : `Ready in ${pluralize(option.maxDays, "day")}`
      : option.maxDays === 0
        ? "Same day"
        : option.minDays === option.maxDays
          ? pluralize(option.maxDays, "day")
          : `${option.minDays}–${option.maxDays} days`;
  return `${rate} · ${days} · ${COVERAGE_LABEL[option.coverage]}`;
};

export function StoreSettingsPanel({ section, settings, loading, update }: StorePanelProps & { section: StoreSection }) {
  if (loading || !settings) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (section === "payments") {
    const last = settings.payments.filter((p) => p.selected).length <= 1;
    return (
      <Section
        note="Payment methods are set up once for your organisation. Choose the ones this website offers."
        manage={{ href: "/payments", label: "Manage payment methods" }}
        empty={settings.payments.length === 0 ? { title: "No payment methods yet", body: "Add one in Payments, then switch it on here." } : undefined}
      >
        {settings.payments.map((option) => (
          <OptionRow
            key={option.id}
            mark={PAYMENT_TYPE[option.type].mark}
            title={option.displayName || PAYMENT_TYPE[option.type].defaultName}
            hint={paymentHint(option)}
            badge={option.testMode ? "Test mode" : !option.enabledGlobally ? "Off in Payments" : undefined}
            checked={option.selected}
            disabled={option.selected && last}
            disabledReason={LAST_ONE}
            onChange={(selected) => update({ payment: { id: option.id, selected } })}
            label={`Offer ${option.displayName || PAYMENT_TYPE[option.type].defaultName} on this website`}
          />
        ))}
      </Section>
    );
  }

  const last = settings.delivery.filter((d) => d.selected).length <= 1;
  return (
    <Section
      note="Delivery options come from your Delivery section. Choose the ones this website offers at checkout."
      manage={{ href: "/delivery", label: "Manage delivery options" }}
      empty={settings.delivery.length === 0 ? { title: "No delivery options yet", body: "Add one in Delivery, then switch it on here." } : undefined}
    >
      {settings.delivery.map((option) => (
        <OptionRow
          key={option.id}
          title={option.name || DELIVERY_TYPE_LABEL[option.type]}
          hint={deliveryHint(option)}
          badge={option.enabledGlobally ? DELIVERY_TYPE_LABEL[option.type] : "Off in Delivery"}
          checked={option.selected}
          disabled={option.selected && last}
          disabledReason={LAST_ONE}
          onChange={(selected) => update({ delivery: { id: option.id, selected } })}
          label={`Offer ${option.name || DELIVERY_TYPE_LABEL[option.type]} on this website`}
        />
      ))}
    </Section>
  );
}

function Section({
  note,
  manage,
  empty,
  children,
}: {
  note: string;
  manage: { href: string; label: string };
  empty?: { title: string; body: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{note} Changes here save immediately.</p>
      {empty ? (
        <div className="rounded-card border border-line bg-surface px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">{empty.title}</p>
          <p className="mt-1 text-xs text-muted">{empty.body}</p>
        </div>
      ) : (
        children
      )}
      <ButtonLink href={manage.href} variant="secondary" size="sm" className="self-start">
        {manage.label}
        <ArrowUpRight className="size-4" aria-hidden />
      </ButtonLink>
    </div>
  );
}

function OptionRow({
  mark,
  title,
  hint,
  badge,
  checked,
  disabled,
  disabledReason,
  onChange,
  label,
}: {
  mark?: string;
  title: string;
  hint: string;
  badge?: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-md border border-line bg-surface p-3", disabled && "opacity-70")}
      title={disabled ? disabledReason : undefined}
    >
      {mark && (
        <span className="relative h-8 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-page">
          <Image src={mark} alt="" fill sizes="48px" className="object-contain p-0.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-ink">{title}</p>
          {badge && <Badge tone="neutral">{badge}</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
        {disabled && <p className="mt-1 text-xs text-faint">{disabledReason}</p>}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
