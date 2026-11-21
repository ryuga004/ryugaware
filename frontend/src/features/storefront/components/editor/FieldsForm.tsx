"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { FormField } from "@/components/platform/FormField";
import { ImageUpload } from "@/components/platform/ImageUpload";
import { createContext, useContext } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { ColorInput } from "@/components/ui/ColorInput";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import type { FieldDef, SitePage } from "../../types";

/**
 * Renders an editing form from a template's field schema.
 *
 * This is why a new template needs no editor code: the manifest says a hero has a heading, an
 * image and a link, and the right controls appear. The renderer reads the same values back.
 */
type Uploader = (file: File) => Promise<string>;

const UploadContext = createContext<Uploader | undefined>(undefined);

/** Supplies the editor's asset uploader to every `image` field below it. */
export const AssetUploadProvider = UploadContext.Provider;

export function FieldsForm({
  fields,
  values,
  pages,
  onChange,
  onError,
}: {
  fields: FieldDef[];
  values: Record<string, unknown>;
  /** Used by `link` fields to offer the website's own pages. */
  pages: SitePage[];
  onChange: (key: string, value: unknown) => void;
  onError?: (message: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {fields.map((field) => (
        <Field key={field.key} field={field} value={values[field.key]} pages={pages} onChange={(v) => onChange(field.key, v)} onError={onError} />
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  pages,
  onChange,
  onError,
}: {
  field: FieldDef;
  value: unknown;
  pages: SitePage[];
  onChange: (value: unknown) => void;
  onError?: (message: string) => void;
}) {
  const upload = useContext(UploadContext);
  const text = typeof value === "string" ? value : "";

  if (field.type === "boolean") {
    const on = value === true;
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{field.label}</p>
          {field.help && <p className="mt-0.5 text-xs text-muted">{field.help}</p>}
        </div>
        <Switch checked={on} onCheckedChange={onChange} aria-label={field.label} />
      </div>
    );
  }

  if (field.type === "list") {
    return <ListField field={field} value={value} pages={pages} onChange={onChange} onError={onError} />;
  }

  const counter = field.max && (field.type === "text" || field.type === "textarea") ? `${text.length}/${field.max}` : undefined;

  return (
    <FormField
      label={field.label}
      hint={field.help}
      required={field.required}
      labelAction={counter ? <span className="text-xs text-faint tabular-nums">{counter}</span> : undefined}
    >
      {(control) => {
        switch (field.type) {
          case "textarea":
            return <Textarea {...control} value={text} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
          case "number":
            return (
              <Input
                {...control}
                type="number"
                min={field.min}
                max={field.max}
                value={typeof value === "number" ? String(value) : ""}
                onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            );
          case "select":
            return <Select {...control} value={text} options={field.choices ?? []} onChange={(e) => onChange(e.target.value)} />;
          case "color":
            return <ColorInput {...control} value={text} onChange={onChange} />;
          case "image":
            return <ImageUpload id={control.id} value={text || null} onChange={(v) => onChange(v ?? "")} onError={onError} upload={upload} />;
          case "link":
            return <LinkField {...control} value={text} pages={pages} onChange={onChange} />;
          default:
            return <Input {...control} value={text} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
        }
      }}
    </FormField>
  );
}

/** Links point at one of the website's own pages, or anywhere else by full address. */
function LinkField({
  id,
  value,
  pages,
  onChange,
  ...aria
}: {
  id: string;
  value: string;
  pages: SitePage[];
  onChange: (value: string) => void;
  invalid?: boolean;
  "aria-describedby"?: string;
}) {
  const choices = pages
    .filter((p) => p.enabled && !p.path.includes(":"))
    .map((p) => ({ value: p.path, label: `${p.title} (${p.path})` }));
  const custom = value !== "" && !choices.some((c) => c.value === value);

  return (
    <div className="flex flex-col gap-2">
      <Select
        id={id}
        value={custom ? "__custom" : value}
        aria-describedby={aria["aria-describedby"]}
        onChange={(e) => onChange(e.target.value === "__custom" ? "https://" : e.target.value)}
        options={[{ value: "", label: "No link" }, ...choices, { value: "__custom", label: "Custom address…" }]}
      />
      {custom && <Input value={value} mono onChange={(e) => onChange(e.target.value)} placeholder="https://example.com" aria-label="Link address" />}
    </div>
  );
}

function ListField({
  field,
  value,
  pages,
  onChange,
  onError,
}: {
  field: FieldDef;
  value: unknown;
  pages: SitePage[];
  onChange: (value: unknown) => void;
  onError?: (message: string) => void;
}) {
  const items = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
  const itemFields = field.fields ?? [];
  const full = field.maxItems !== undefined && items.length >= field.maxItems;

  const replace = (next: Record<string, unknown>[]) => onChange(next);
  const move = (index: number, by: number) => {
    const next = [...items];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    replace(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{field.label}</p>
        <span className="text-xs text-faint tabular-nums">{items.length}{field.maxItems ? `/${field.maxItems}` : ""}</span>
      </div>
      {field.help && <p className="mt-0.5 text-xs text-muted">{field.help}</p>}

      <div className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-card border border-line bg-page p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-ink">
                {String(item[field.itemLabelKey ?? "label"] ?? `Item ${index + 1}`) || `Item ${index + 1}`}
              </p>
              <div className="flex items-center gap-0.5">
                <IconButton label="Move up" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp className="size-4" />
                </IconButton>
                <IconButton label="Move down" size="sm" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                  <ChevronDown className="size-4" />
                </IconButton>
                <IconButton label="Remove" size="sm" danger onClick={() => replace(items.filter((_, i) => i !== index))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>
            <FieldsForm
              fields={itemFields}
              values={item}
              pages={pages}
              onError={onError}
              onChange={(key, v) => replace(items.map((it, i) => (i === index ? { ...it, [key]: v } : it)))}
            />
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        leftIcon={<Plus className="size-4" />}
        disabled={full}
        title={full ? `This list holds at most ${field.maxItems} items.` : undefined}
        onClick={() => replace([...items, Object.fromEntries(itemFields.map((f) => [f.key, f.type === "number" ? 5 : ""]))])}
      >
        Add {field.label.replace(/s$/, "").toLowerCase()}
      </Button>
    </div>
  );
}
