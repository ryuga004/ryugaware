import { cn } from "@/lib/cn";

/** Left: title + description. Right: bordered panel. Stacks on tablet and mobile. Shared by Settings and Profile. */
export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-4 lg:grid-cols-3 lg:gap-8", className)}>
      <div>
        <h2 className="font-heading text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="rounded-card border border-line bg-surface p-6 lg:col-span-2">{children}</div>
    </section>
  );
}

/** Label / value rows separated by thin dividers. */
export function DescriptionList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
          <dt className="text-sm text-muted sm:w-44 sm:shrink-0">{item.label}</dt>
          <dd className="min-w-0 flex-1 text-sm font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
