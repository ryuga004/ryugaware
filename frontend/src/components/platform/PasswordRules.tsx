import { Circle, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "letter", label: "Contains a letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { id: "number", label: "Contains a number", test: (v: string) => /\d/.test(v) },
] as const;

export const isStrongPassword = (v: string) => PASSWORD_RULES.every((r) => r.test(v));

/** Live checklist: unmet rules are muted, met rules turn green with a check. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul aria-label="Password requirements" className="flex flex-col gap-1.5">
      {PASSWORD_RULES.map((r) => {
        const met = r.test(value);
        return (
          <li key={r.id} className={cn("flex items-center gap-2 text-xs", met ? "text-success" : "text-muted")}>
            {met ? <CircleCheck className="size-4" aria-hidden /> : <Circle className="size-4 text-faint" aria-hidden />}
            <span>
              {r.label}
              <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
