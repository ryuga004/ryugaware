"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { DELIVERY_TYPE_LABEL } from "@/features/delivery/constants";
import { PAYMENT_PROVIDER, PAYMENT_TYPE } from "@/features/payments/constants";
import type { StoreSettingsPatch, WebsiteDeliveryOption, WebsitePaymentOption, WebsiteStoreSettings } from "@/features/website-settings/types";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export type StoreSection = "payments" | "delivery" | "auth" | "storage";

export interface StorePanelProps {
  settings: WebsiteStoreSettings | undefined;
  loading: boolean;
  update: (patch: StoreSettingsPatch) => void;
}

export const STORE_SECTIONS: { key: StoreSection; title: string; hint: string }[] = [
  { key: "payments", title: "Payments", hint: "How this website takes money" },
  { key: "delivery", title: "Delivery", hint: "How orders reach the customer" },
  { key: "auth", title: "Customer accounts", hint: "How shoppers sign in" },
  { key: "storage", title: "Media storage", hint: "Where this website's files live" },
];

/** Short summary for the row in the editor's root list. */
export function storeSummary(section: StoreSection, settings: WebsiteStoreSettings | undefined) {
  if (!settings) return undefined;
  if (section === "payments") return `${settings.payments.filter((p) => p.selected).length} of ${settings.payments.length} methods`;
  if (section === "delivery") return `${settings.delivery.filter((d) => d.selected).length} of ${settings.delivery.length} methods`;
  if (section === "auth") {
    const on = [settings.auth.email && "Email", settings.auth.google && "Google"].filter(Boolean).join(" · ");
    return `${on || "Sign-in switched off"}${settings.auth.overridden ? "" : " (default)"}`;
  }
  return settings.storage.useConnected ? settings.storage.bucket : "Ryugaware storage";
}

const paymentHint = (option: WebsitePaymentOption) => {
  const provider = PAYMENT_PROVIDER[option.provider].label;
  if (option.type === "cod") return option.feeFixed > 0 ? `Collected by courier · ${formatMoney(option.feeFixed)} fee` : "Collected by courier";
  const fee = option.feePercent > 0 ? `${option.feePercent}% per payment` : "No gateway fee";
  return `${provider} · ${fee}`;
};

const deliveryHint = (option: WebsiteDeliveryOption) => {
  const rate =
    option.rateType === "free"
      ? "Free"
      : option.rateType === "free_above" && option.freeAbove !== null
        ? `${formatMoney(option.price)}, free above ${formatMoney(option.freeAbove)}`
        : formatMoney(option.price);
  const days = option.maxDays === 0 ? "Same day" : option.minDays === option.maxDays ? `${option.maxDays} days` : `${option.minDays}–${option.maxDays} days`;
  return `${rate} · ${days} · ${option.carrier}`;
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
            hint={option.enabledGlobally ? paymentHint(option) : "Switched off in Payments · turning this on switches it back on"}
            badge={option.testMode ? "Test mode" : undefined}
            checked={option.selected}
            onChange={(selected) => update({ payment: { id: option.id, selected } })}
            label={`Offer ${option.displayName} on this website`}
          />
        ))}
      </Section>
    );
  }

  if (section === "delivery") {
    return (
      <Section
        note="Delivery methods come from your Delivery section. Choose the ones this website offers at checkout."
        manage={{ href: "/delivery", label: "Manage delivery methods" }}
        empty={settings.delivery.length === 0 ? { title: "No delivery methods yet", body: "Add one in Delivery, then switch it on here." } : undefined}
      >
        {settings.delivery.map((option) => (
          <OptionRow
            key={option.id}
            title={option.name || DELIVERY_TYPE_LABEL[option.type]}
            hint={option.enabledGlobally ? deliveryHint(option) : "Switched off in Delivery · turning this on switches it back on"}
            badge={DELIVERY_TYPE_LABEL[option.type]}
            checked={option.selected}
            onChange={(selected) => update({ delivery: { id: option.id, selected } })}
            label={`Offer ${option.name} on this website`}
          />
        ))}
      </Section>
    );
  }

  if (section === "auth") {
    const { auth } = settings;
    return (
      <Section
        note="Shoppers can sign in to this website to check out faster and see their orders."
        manage={{ href: "/authentication", label: "Open Authentication" }}
      >
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Use the organisation default</p>
              <p className="mt-0.5 text-xs text-muted">
                Default: {[auth.defaultEmail && "email", auth.defaultGoogle && "Google"].filter(Boolean).join(" and ") || "sign-in switched off"}.
              </p>
            </div>
            <Switch
              checked={!auth.overridden}
              aria-label="Use the organisation default sign-in settings"
              onCheckedChange={(useDefault) =>
                update({ auth: useDefault ? { overridden: false } : { overridden: true, email: auth.email, google: auth.google } })
              }
            />
          </div>
        </div>

        <OptionRow
          title="Email and password"
          hint="Shoppers create an account with their email address."
          checked={auth.email}
          disabled={!auth.overridden}
          disabledReason="Switch off the organisation default to change this website on its own."
          onChange={(email) => update({ auth: { overridden: true, email, google: auth.google } })}
          label="Email sign-in on this website"
        />
        <OptionRow
          title="Google sign-in"
          hint={auth.googleConfigured ? "One tap with a Google account." : "Add a Google client ID in Authentication first."}
          checked={auth.google}
          disabled={!auth.overridden || !auth.googleConfigured}
          disabledReason={
            !auth.googleConfigured
              ? "Google sign-in is not configured for your organisation yet."
              : "Switch off the organisation default to change this website on its own."
          }
          onChange={(google) => update({ auth: { overridden: true, email: auth.email, google } })}
          label="Google sign-in on this website"
        />
      </Section>
    );
  }

  const { storage } = settings;
  const connected = storage.status === "connected";
  return (
    <Section
      note="Product pictures and uploads for this website are served from here."
      manage={{ href: "/storage", label: "Open Storage" }}
    >
      <OptionRow
        title={connected ? `Your bucket · ${storage.bucket}` : "Your own bucket"}
        hint={connected ? "Files are written to the bucket you connected in Storage." : "No bucket is connected to your organisation yet."}
        checked={storage.useConnected}
        disabled={!connected}
        disabledReason="Connect a bucket in Storage to use your own."
        onChange={(useConnected) => update({ storage: { useConnected } })}
        label="Use the connected bucket for this website"
      />
      <p className="px-1 text-xs text-muted">
        {storage.useConnected && connected
          ? "Switch this off to keep this website’s media in Ryugaware storage instead."
          : "This website uses Ryugaware storage, included with your licence."}
      </p>
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
    <div className={cn("flex items-start gap-3 rounded-md border border-line bg-surface p-3", disabled && "opacity-70")} title={disabled ? disabledReason : undefined}>
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
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
