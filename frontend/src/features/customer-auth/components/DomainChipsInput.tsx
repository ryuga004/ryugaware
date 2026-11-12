"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { EMAIL_DOMAIN_PATTERN } from "../constants";
import { normaliseDomain } from "../schemas";

/** Chip list of email domains. Enter, comma, space, paste or leaving the field adds what was typed. */
export function DomainChipsInput({
  id,
  value,
  onChange,
  invalid,
  "aria-describedby": describedBy,
  max,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  invalid?: boolean;
  "aria-describedby"?: string;
  max: number;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = (text: string) => {
    const parts = text.split(/[\s,;]+/).map(normaliseDomain).filter(Boolean);
    if (!parts.length) return;
    const bad = parts.filter((p) => !EMAIL_DOMAIN_PATTERN.test(p));
    const next = [...value];
    for (const p of parts) if (EMAIL_DOMAIN_PATTERN.test(p) && !next.includes(p)) next.push(p);
    if (next.length > max) {
      setError(`Add up to ${max} domains.`);
      return;
    }
    setError(bad.length ? `${bad.join(", ")} ${bad.length === 1 ? "isn’t a valid domain" : "aren’t valid domains"}. Use a domain like yourcompany.com.` : null);
    setDraft(bad.join(" "));
    if (next.length !== value.length) onChange(next);
  };

  const remove = (domain: string) => onChange(value.filter((d) => d !== domain));

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border bg-surface px-1.5 py-1 transition-shadow",
          invalid || error ? "border-danger" : "border-line-strong",
          "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ember/20",
        )}
      >
        {value.map((d) => (
          <span key={d} className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-line bg-subtle pr-1 pl-2.5 text-xs font-medium text-ink-700">
            <span className="truncate">{d}</span>
            <button
              type="button"
              onClick={() => remove(d)}
              aria-label={`Remove ${d}`}
              className="flex size-4 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          aria-invalid={invalid || Boolean(error) || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === " ") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]!);
            }
          }}
          onBlur={() => commit(draft)}
          onPaste={(e) => {
            e.preventDefault();
            commit(`${draft} ${e.clipboardData.getData("text")}`);
          }}
          placeholder={value.length ? "Add another" : "yourcompany.com, partner.org"}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-7 min-w-[12ch] flex-1 bg-transparent px-1.5 text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-hover">
          {error}
        </p>
      )}
    </div>
  );
}
