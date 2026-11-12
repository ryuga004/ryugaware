"use client";

import { Badge } from "@/components/ui/Badge";
import { WebsiteSelect } from "@/features/websites/components/WebsiteSelect";

/** "Applies to: Default for all websites / <website>" with the inherit / override state of a website scope. */
export function ContactScopeRow({
  value,
  onChange,
  inherited,
  disabled,
}: {
  value: string;
  onChange: (scope: string) => void;
  /** null for the default scope or while loading. */
  inherited: boolean | null;
  disabled?: boolean;
}) {
  const isDefault = value === "default";
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
      <label htmlFor="contact-scope" className="text-sm font-medium text-ink">
        Applies to
      </label>
      <WebsiteSelect id="contact-scope" value={value} onChange={onChange} allLabel="Default for all websites" allValue="default" className="sm:w-72" disabled={disabled} />
      <div className="flex flex-wrap items-center gap-2">
        {!isDefault && inherited !== null && (inherited ? <Badge>Inherits default</Badge> : <Badge tone="ember">Overridden</Badge>)}
        <p className="text-sm text-muted">
          {isDefault ? "Websites without their own details use these." : inherited ? "Uses the default details." : "Overrides the default for this website only."}
        </p>
      </div>
    </div>
  );
}
