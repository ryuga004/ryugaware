"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { Alert } from "@/components/platform/Alert";
import { FormField } from "@/components/platform/FormField";
import { ImageUpload } from "@/components/platform/ImageUpload";
import { PageHeader } from "@/components/platform/PageHeader";
import { Button } from "@/components/ui/Button";
import { ColorInput, isHexColor } from "@/components/ui/ColorInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useGetLicenseQuery } from "@/features/account/api";
import { selectLicense, selectLimitReached } from "@/features/account/slice";
import { getTemplate } from "@/features/storefront/templates";
import type { FontPair, TemplateManifest } from "@/features/storefront/types";
import { pushToast } from "@/features/ui/slice";
import { BASE_DOMAIN } from "@/lib/api/config";
import { isApiError } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useCreateWebsiteMutation, useLazyCheckSubdomainQuery } from "../../api";
import { TemplateGallery } from "./TemplateGallery";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";

type Step = "template" | "details" | "branding" | "pages" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "branding", label: "Branding" },
  { key: "pages", label: "Pages" },
  { key: "review", label: "Review" },
];

interface Draft {
  name: string;
  subdomain: string;
  description: string;
  brandName: string;
  logo: string | null;
  primary: string;
  secondary: string;
  fontPair: FontPair;
  disabledPages: string[];
}

type Errors = Partial<Record<keyof Draft, string>>;

const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/**
 * Create a website from a template: pick the template, name it, brand it, choose its pages, review.
 * Creating it copies the template's content into the new website (see `instantiateSite`), so what
 * the customer configures here is the starting point of their own, independent website.
 */
export function CreateWebsiteFlow() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<Step>("template");
  const [template, setTemplate] = useState<TemplateManifest | null>(null);
  const [previewing, setPreviewing] = useState<TemplateManifest | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState<Draft>({
    name: "",
    subdomain: "",
    description: "",
    brandName: "",
    logo: null,
    primary: "#17352f",
    secondary: "#c08a4e",
    fontPair: "serif",
    disabledPages: [],
  });

  useGetLicenseQuery();
  const license = useAppSelector(selectLicense);
  const limitReached = useAppSelector(selectLimitReached);

  const [checkSubdomain, { isFetching: checking }] = useLazyCheckSubdomainQuery();
  const [createWebsite, { isLoading: creating }] = useCreateWebsiteMutation();

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const chooseTemplate = (picked: TemplateManifest) => {
    setTemplate(picked);
    setPreviewing(null);
    set({ primary: picked.defaultTheme.primary, secondary: picked.defaultTheme.secondary, fontPair: picked.defaultTheme.fontPair });
    setStep("details");
  };

  const validateDetails = async () => {
    const next: Errors = {};
    const name = draft.name.trim();
    const subdomain = draft.subdomain.trim().toLowerCase();
    if (!name) next.name = "Enter a website name.";
    else if (name.length > 60) next.name = "Use 60 characters or fewer.";
    if (!SUBDOMAIN_RE.test(subdomain)) next.subdomain = "Use 3–40 lowercase letters, numbers or hyphens.";
    if (draft.description.length > 160) next.description = "Use 160 characters or fewer.";
    if (Object.keys(next).length) {
      setErrors(next);
      return false;
    }
    const result = await checkSubdomain(subdomain).unwrap().catch(() => null);
    if (result && !result.available) {
      setErrors({ subdomain: result.suggestion ? `Already taken. Try ${result.suggestion}` : "That web address is already taken." });
      return false;
    }
    setErrors({});
    if (!draft.brandName.trim()) set({ brandName: name });
    return true;
  };

  const validateBranding = () => {
    const next: Errors = {};
    if (!draft.brandName.trim()) next.brandName = "Enter a brand name.";
    else if (draft.brandName.trim().length > 40) next.brandName = "Use 40 characters or fewer.";
    if (!isHexColor(draft.primary)) next.primary = "Use a hex colour such as #17352F.";
    if (!isHexColor(draft.secondary)) next.secondary = "Use a hex colour such as #C08A4E.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = async () => {
    if (step === "details" && !(await validateDetails())) return;
    if (step === "branding" && !validateBranding()) return;
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].key);
  };

  const back = () => {
    setErrors({});
    if (step === "details") {
      setTemplate(null);
      setStep("template");
      return;
    }
    setStep(STEPS[Math.max(stepIndex - 1, 0)].key);
  };

  const create = async () => {
    if (!template) return;
    try {
      const website = await createWebsite({
        name: draft.name.trim(),
        subdomain: draft.subdomain.trim().toLowerCase(),
        templateId: template.id,
        description: draft.description.trim(),
        brandName: draft.brandName.trim(),
        logo: draft.logo,
        primary: draft.primary,
        secondary: draft.secondary,
        fontPair: draft.fontPair,
        disabledPages: draft.disabledPages,
      }).unwrap();
      router.push(`/websites/${website.id}/created`);
    } catch (e) {
      if (isApiError(e) && e.data.fieldErrors?.subdomain) {
        setErrors({ subdomain: e.data.fieldErrors.subdomain });
        setStep("details");
      }
    }
  };

  if (step === "template") {
    return (
      <>
        <PageHeader
          title="Create a website"
          description="Start from a template. You can change every word, picture and colour afterwards."
          actions={
            <Button variant="secondary" leftIcon={<ArrowLeft className="size-4" />} onClick={() => router.push("/websites")}>
              Back to websites
            </Button>
          }
        />
        {limitReached && (
          <Alert tone="warning" className="mb-5">
            Your licence includes {license?.allowance ?? 0} websites and all of them are in use. Delete one to create another.
          </Alert>
        )}
        <TemplateGallery onPreview={setPreviewing} onUse={chooseTemplate} />
        <TemplatePreviewDialog template={previewing} open={previewing !== null} onClose={() => setPreviewing(null)} onUse={chooseTemplate} />
      </>
    );
  }

  const manifest = template!;
  const pageDefs = getTemplate(manifest.id)?.manifest.pages ?? [];

  return (
    <>
      <PageHeader
        title="Create a website"
        description={`Using the ${manifest.name} template`}
        actions={
          <Button variant="secondary" leftIcon={<ArrowLeft className="size-4" />} onClick={back}>
            Back
          </Button>
        }
      />

      <Stepper current={stepIndex} />

      <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
        {step === "details" && (
          <div className="grid max-w-xl gap-5">
            <FormField label="Website name" required error={errors.name} hint="Shown in your dashboard. Your visitors never see it.">
              {(control) => (
                <Input
                  {...control}
                  value={draft.name}
                  placeholder="Urban Threads"
                  onChange={(e) => {
                    const value = e.target.value;
                    set({ name: value, subdomain: draft.subdomain || slugify(value).slice(0, 40) });
                  }}
                  onBlur={() => !draft.subdomain && set({ subdomain: slugify(draft.name).slice(0, 40) })}
                />
              )}
            </FormField>

            <FormField
              label="Web address"
              required
              error={errors.subdomain}
              hint={`Your website will be at ${draft.subdomain || "your-store"}.${BASE_DOMAIN}. You can connect your own domain later.`}
            >
              {(control) => (
                <Input
                  {...control}
                  mono
                  value={draft.subdomain}
                  placeholder="urban-threads"
                  suffix={`.${BASE_DOMAIN}`}
                  onChange={(e) => set({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                />
              )}
            </FormField>

            <FormField label="Short description" error={errors.description} hint="Used as the website’s default description. Optional.">
              {(control) => (
                <Input {...control} value={draft.description} placeholder="Everyday clothing made in small batches." onChange={(e) => set({ description: e.target.value })} />
              )}
            </FormField>
          </div>
        )}

        {step === "branding" && (
          <div className="grid max-w-xl gap-5">
            <FormField label="Logo" hint="PNG, JPG, WebP or SVG up to 512 KB. Without one we use your brand name.">
              {(control) => (
                <ImageUpload
                  id={control.id}
                  value={draft.logo}
                  onChange={(logo) => set({ logo })}
                  onError={(message) => dispatch(pushToast({ tone: "error", title: "Couldn’t add that image", description: message }))}
                />
              )}
            </FormField>

            <FormField label="Brand name" required error={errors.brandName} hint="Appears in the header and the footer of your website.">
              {(control) => <Input {...control} value={draft.brandName} placeholder="Urban Threads" onChange={(e) => set({ brandName: e.target.value })} />}
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Primary colour" error={errors.primary} hint="Buttons and links.">
                {(control) => <ColorInput {...control} value={draft.primary} onChange={(primary) => set({ primary })} />}
              </FormField>
              <FormField label="Secondary colour" error={errors.secondary} hint="Badges and small accents.">
                {(control) => <ColorInput {...control} value={draft.secondary} onChange={(secondary) => set({ secondary })} />}
              </FormField>
            </div>

            <FormField label="Typography" hint="Headings only. Body text stays the same.">
              {(control) => (
                <Select
                  {...control}
                  value={draft.fontPair}
                  onChange={(e) => set({ fontPair: e.target.value as FontPair })}
                  options={[
                    { value: "serif", label: "Serif headings" },
                    { value: "sans", label: "Sans headings" },
                  ]}
                />
              )}
            </FormField>

            <div className="flex items-center justify-between gap-4 rounded-card border border-line bg-page px-4 py-3">
              <p className="text-sm text-muted">Start from the template’s own colours.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => set({ primary: manifest.defaultTheme.primary, secondary: manifest.defaultTheme.secondary, fontPair: manifest.defaultTheme.fontPair })}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {step === "pages" && (
          <div className="max-w-2xl">
            <p className="mb-5 text-sm text-muted">
              These pages come with the template. Switch off the ones you do not need — you can turn them back on at any time in the editor.
            </p>
            <ul className="divide-y divide-line rounded-card border border-line">
              {pageDefs.map((page) => {
                const off = draft.disabledPages.includes(page.key);
                const governed = Boolean(page.governedBy);
                return (
                  <li key={page.key} className="flex items-start gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{page.label}</p>
                        <code className="font-mono text-xs text-muted">{page.path}</code>
                        {page.required && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Lock className="size-3" aria-hidden />
                            Required
                          </span>
                        )}
                        {governed && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted">
                            <Lock className="size-3" aria-hidden />
                            Follows customer accounts
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">{page.description}</p>
                      {page.required && page.requiredReason && <p className="mt-1 text-xs text-muted">{page.requiredReason}</p>}
                      {governed && <p className="mt-1 text-xs text-muted">Appears while this website offers customer sign-in, which you set up after creating it.</p>}
                    </div>
                    <div className="pt-0.5" title={page.required ? page.requiredReason : governed ? "This page follows your customer accounts setting." : undefined}>
                      <Switch
                        checked={page.required || governed ? true : !off}
                        disabled={page.required || governed}
                        aria-label={`Include ${page.label}`}
                        onCheckedChange={(on) =>
                          set({ disabledPages: on ? draft.disabledPages.filter((k) => k !== page.key) : [...draft.disabledPages, page.key] })
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === "review" && (
          <div className="max-w-2xl">
            <h2 className="font-heading text-base font-semibold text-ink">Review your website</h2>
            <p className="mt-1 text-sm text-muted">Everything here can be changed afterwards in the website editor.</p>
            <dl className="mt-5 divide-y divide-line rounded-card border border-line">
              <ReviewRow label="Template" value={`${manifest.name} · v${manifest.version}`} />
              <ReviewRow label="Website name" value={draft.name.trim()} />
              <ReviewRow label="Web address" value={`${draft.subdomain}.${BASE_DOMAIN}`} mono />
              <ReviewRow label="Description" value={draft.description.trim() || "—"} />
              <ReviewRow label="Brand name" value={draft.brandName.trim()} />
              <ReviewRow
                label="Colours"
                value={
                  <span className="flex items-center gap-3">
                    <Swatch color={draft.primary} />
                    <Swatch color={draft.secondary} />
                  </span>
                }
              />
              <ReviewRow label="Typography" value={draft.fontPair === "serif" ? "Serif headings" : "Sans headings"} />
              <ReviewRow
                label="Pages"
                value={`${pageDefs.length - draft.disabledPages.length} of ${pageDefs.length} included${
                  draft.disabledPages.length ? ` · off: ${pageDefs.filter((p) => draft.disabledPages.includes(p.key)).map((p) => p.label).join(", ")}` : ""
                }`}
              />
            </dl>
            {limitReached && (
              <Alert tone="warning" className="mt-5">
                Your licence includes {license?.allowance ?? 0} websites and all of them are in use.
              </Alert>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 max-sm:flex-col-reverse max-sm:[&>*]:w-full">
        <Button variant="ghost" onClick={back} disabled={creating}>
          Back
        </Button>
        <div className="flex items-center gap-3 max-sm:w-full max-sm:[&>button]:flex-1">
          {step === "review" ? (
            <Button onClick={create} loading={creating} disabled={limitReached} title={limitReached ? "Your licence has no websites left." : undefined}>
              {creating ? "Creating website…" : "Create website"}
            </Button>
          ) : (
            <Button onClick={next} loading={checking}>
              {checking ? "Checking…" : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                done && "border-primary bg-primary text-white",
                active && "border-primary bg-tint text-primary",
                !done && !active && "border-line text-muted",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", active ? "text-ink" : "text-muted")} aria-current={active ? "step" : undefined}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("text-sm text-ink", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-4 rounded-full border border-line" style={{ backgroundColor: color }} aria-hidden />
      <span className="font-mono text-xs text-muted uppercase">{color}</span>
    </span>
  );
}
