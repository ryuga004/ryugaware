import { Badge, type BadgeTone } from "@/components/ui/Badge";

export type StatusMap<K extends string> = Record<K, { label: string; tone: BadgeTone }>;

/** Badge with a leading dot, driven by a per-feature status map (label + tone). Never color alone. */
export function StatusBadge<K extends string>({ value, map, className }: { value: K; map: StatusMap<K>; className?: string }) {
  const s = map[value];
  return (
    <Badge tone={s.tone} className={className}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {s.label}
    </Badge>
  );
}
