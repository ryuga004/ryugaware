"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, Palette, Plus, Store, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/platform/ActionMenu";
import { FormField } from "@/components/platform/FormField";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import type { SiteContent, TemplateManifest } from "../../types";
import { FieldsForm } from "./FieldsForm";
import { STORE_SECTIONS, StoreSettingsPanel, storeSummary, type StorePanelProps, type StoreSection } from "./StoreSettingsPanel";

export type EditorView =
  | { kind: "root" }
  | { kind: "theme" }
  | { kind: "store"; section: StoreSection }
  | { kind: "page"; pageKey: string }
  | { kind: "section"; pageKey: string; sectionId: string };

export interface PanelActions {
  setThemeValue: (key: string, value: unknown) => void;
  setChromeValue: (sectionId: string, key: string, value: unknown) => void;
  setPageSetting: (pageKey: string, key: string, value: unknown) => void;
  setPageSeo: (pageKey: string, key: "title" | "description", value: string) => void;
  setPageEnabled: (pageKey: string, enabled: boolean) => void;
  setSectionValue: (pageKey: string, sectionId: string, key: string, value: unknown) => void;
  setSectionEnabled: (pageKey: string, sectionId: string, enabled: boolean) => void;
  moveSection: (pageKey: string, sectionId: string, by: 1 | -1) => void;
  removeSection: (pageKey: string, sectionId: string) => void;
  addSection: (pageKey: string, type: string) => void;
  onError: (message: string) => void;
}

/** The chrome sections live under this pseudo page key. */
export const CHROME = "__chrome";

export function EditorPanel({
  site,
  manifest,
  view,
  onView,
  actions,
  store,
}: {
  site: SiteContent;
  manifest: TemplateManifest;
  view: EditorView;
  onView: (view: EditorView) => void;
  actions: PanelActions;
  /** Payments and delivery: organisation records, scoped to this website. */
  store: StorePanelProps;
}) {
  if (view.kind === "store") {
    const meta = STORE_SECTIONS.find((s) => s.key === view.section);
    return (
      <PanelShell title={meta?.title ?? "Store settings"} description={meta?.hint} onBack={() => onView({ kind: "root" })}>
        <StoreSettingsPanel section={view.section} settings={store.settings} loading={store.loading} update={store.update} />
      </PanelShell>
    );
  }

  if (view.kind === "theme") {
    return (
      <PanelShell title="Branding & theme" onBack={() => onView({ kind: "root" })}>
        <FieldsForm
          fields={manifest.themeFields}
          values={site.theme as unknown as Record<string, unknown>}
          pages={site.pages}
          onChange={actions.setThemeValue}
          onError={actions.onError}
        />
      </PanelShell>
    );
  }

  if (view.kind === "section") {
    const chrome = view.pageKey === CHROME;
    const section = chrome
      ? site.chrome.find((s) => s.id === view.sectionId)
      : site.pages.find((p) => p.key === view.pageKey)?.sections.find((s) => s.id === view.sectionId);
    const def = section ? manifest.sections[section.type] : undefined;
    const page = site.pages.find((p) => p.key === view.pageKey);

    if (!section || !def) {
      return (
        <PanelShell title="Section" onBack={() => onView({ kind: "root" })}>
          <p className="text-sm text-muted">This section is no longer part of the website.</p>
        </PanelShell>
      );
    }

    return (
      <PanelShell
        title={def.label}
        description={def.description}
        onBack={() => onView(chrome ? { kind: "root" } : { kind: "page", pageKey: view.pageKey })}
        action={
          !def.fixed && !chrome ? (
            <Switch
              checked={section.enabled}
              aria-label={`Show ${def.label}`}
              onCheckedChange={(on) => actions.setSectionEnabled(view.pageKey, section.id, on)}
            />
          ) : undefined
        }
      >
        <FieldsForm
          fields={def.fields}
          values={section.settings}
          pages={site.pages}
          onError={actions.onError}
          onChange={(key, value) => (chrome ? actions.setChromeValue(section.id, key, value) : actions.setSectionValue(view.pageKey, section.id, key, value))}
        />
        {!def.fixed && !chrome && page && (
          <Button
            variant="dangerGhost"
            size="sm"
            className="mt-6"
            leftIcon={<Trash2 className="size-4" />}
            onClick={() => {
              actions.removeSection(view.pageKey, section.id);
              onView({ kind: "page", pageKey: view.pageKey });
            }}
          >
            Remove section
          </Button>
        )}
      </PanelShell>
    );
  }

  if (view.kind === "page") {
    const page = site.pages.find((p) => p.key === view.pageKey);
    const def = manifest.pages.find((p) => p.key === view.pageKey);
    if (!page || !def) return null;

    const allowed = (def.allows ?? []).filter((type) => manifest.sections[type]);

    return (
      <PanelShell title={page.title} description={def.description} onBack={() => onView({ kind: "root" })}>
        {def.governedBy === "signIn" && (
          <div className="mb-5 rounded-md border border-line bg-page px-3.5 py-3">
            <p className="text-sm text-muted">This page belongs to customer accounts, which every website has.</p>
          </div>
        )}
        {!page.enabled && !def.governedBy && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-warning-border bg-warning-bg px-3.5 py-3">
            <p className="text-sm text-warning-text">This page is switched off.</p>
            <Button size="sm" variant="secondary" onClick={() => actions.setPageEnabled(page.key, true)}>
              Turn on
            </Button>
          </div>
        )}

        {page.kind === "content" ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium tracking-wide text-muted uppercase">Sections</h3>
              <span className="text-xs text-faint tabular-nums">{page.sections.length}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {page.sections.map((section, index) => {
                const sectionDef = manifest.sections[section.type];
                return (
                  <li key={section.id} className="flex items-center gap-1 rounded-md border border-line bg-surface pr-1 pl-2">
                    <button
                      type="button"
                      onClick={() => onView({ kind: "section", pageKey: page.key, sectionId: section.id })}
                      className={cn("min-w-0 flex-1 py-2.5 text-left text-sm font-medium", section.enabled ? "text-ink" : "text-faint")}
                    >
                      <span className="block truncate">{sectionDef?.label ?? section.type}</span>
                    </button>
                    <IconButton label={`Move ${sectionDef?.label ?? "section"} up`} size="sm" disabled={index === 0} onClick={() => actions.moveSection(page.key, section.id, -1)}>
                      <ChevronUp className="size-4" />
                    </IconButton>
                    <IconButton label={`Move ${sectionDef?.label ?? "section"} down`} size="sm" disabled={index === page.sections.length - 1} onClick={() => actions.moveSection(page.key, section.id, 1)}>
                      <ChevronDown className="size-4" />
                    </IconButton>
                    <IconButton
                      label={section.enabled ? `Hide ${sectionDef?.label ?? "section"}` : `Show ${sectionDef?.label ?? "section"}`}
                      size="sm"
                      onClick={() => actions.setSectionEnabled(page.key, section.id, !section.enabled)}
                    >
                      {section.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </IconButton>
                  </li>
                );
              })}
            </ul>

            {allowed.length > 0 && (
              <ActionMenu
                align="start"
                trigger={
                  <Button variant="secondary" size="sm" className="mt-3" leftIcon={<Plus className="size-4" />}>
                    Add section
                  </Button>
                }
                items={allowed.map((type) => ({
                  key: type,
                  label: manifest.sections[type].label,
                  onSelect: () => actions.addSection(page.key, type),
                }))}
              />
            )}
          </>
        ) : (
          <FieldsForm
            fields={def.fields ?? []}
            values={page.settings}
            pages={site.pages}
            onError={actions.onError}
            onChange={(key, value) => actions.setPageSetting(page.key, key, value)}
          />
        )}

        <div className="mt-8 border-t border-line pt-6">
          <h3 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">Search engines</h3>
          <div className="flex flex-col gap-4">
            <FormField label="Page title">
              {(control) => <Input {...control} value={page.seo.title} maxLength={60} onChange={(e) => actions.setPageSeo(page.key, "title", e.target.value)} />}
            </FormField>
            <FormField label="Meta description" hint="Shown under the title in search results.">
              {(control) => (
                <Textarea {...control} value={page.seo.description} maxLength={160} onChange={(e) => actions.setPageSeo(page.key, "description", e.target.value)} />
              )}
            </FormField>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <div className="p-4">
      <Row icon={<Palette className="size-[18px] text-muted" aria-hidden />} title="Branding & theme" hint="Logo, colours and typography" onClick={() => onView({ kind: "theme" })} />

      <h3 className="mt-6 mb-2 px-1 text-xs font-medium tracking-wide text-muted uppercase">Header & footer</h3>
      <div className="flex flex-col gap-1.5">
        {site.chrome.map((section) => {
          const def = manifest.sections[section.type];
          return (
            <Row
              key={section.id}
              title={def?.label ?? section.type}
              hint={def?.description}
              onClick={() => onView({ kind: "section", pageKey: CHROME, sectionId: section.id })}
            />
          );
        })}
      </div>

      <h3 className="mt-6 mb-2 px-1 text-xs font-medium tracking-wide text-muted uppercase">Store settings</h3>
      <div className="flex flex-col gap-1.5">
        {STORE_SECTIONS.map((section) => (
          <Row
            key={section.key}
            icon={<Store className="size-[18px] text-muted" aria-hidden />}
            title={section.title}
            hint={storeSummary(section.key, store.settings) ?? section.hint}
            onClick={() => onView({ kind: "store", section: section.key })}
          />
        ))}
      </div>

      <h3 className="mt-6 mb-2 px-1 text-xs font-medium tracking-wide text-muted uppercase">Pages</h3>
      <div className="flex flex-col gap-1.5">
        {site.pages.map((page) => {
          const def = manifest.pages.find((p) => p.key === page.key);
          return (
            <Row
              key={page.key}
              title={page.title}
              hint={def?.governedBy ? "Part of customer accounts" : page.kind === "content" ? `${page.sections.length} sections` : def?.description}
              muted={!page.enabled}
              onClick={() => onView({ kind: "page", pageKey: page.key })}
              action={
                def?.required || def?.governedBy ? undefined : (
                  <Switch
                    checked={page.enabled}
                    aria-label={`Include ${page.title}`}
                    onCheckedChange={(on) => actions.setPageEnabled(page.key, on)}
                  />
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function PanelShell({
  title,
  description,
  onBack,
  action,
  children,
}: {
  title: string;
  description?: string;
  onBack: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden />
        Back
      </button>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  title,
  hint,
  icon,
  action,
  muted,
  onClick,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-surface pr-2 transition-colors hover:border-line-strong">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 text-left">
        {icon}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", muted ? "text-faint" : "text-ink")}>{title}</span>
          {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
        </span>
        {!action && <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />}
      </button>
      {action}
    </div>
  );
}
