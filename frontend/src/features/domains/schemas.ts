import { z } from "zod";

/** A registrable hostname such as shop.example.com (no scheme, path or port). */
export const HOSTNAME_PATTERN = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

/** Lowercases and strips anything pasted around the hostname (scheme, path, trailing dot). */
export function normaliseHostname(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

export const addDomainSchema = z.object({
  hostname: z
    .string()
    .transform(normaliseHostname)
    .pipe(z.string().min(1, "Enter a domain.").regex(HOSTNAME_PATTERN, "Enter a domain like shop.example.com.")),
  websiteId: z.string().min(1, "Choose a website."),
});

export type AddDomainValues = z.input<typeof addDomainSchema>;
export type AddDomainOutput = z.output<typeof addDomainSchema>;
