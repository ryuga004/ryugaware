import { z } from "zod";

export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const createWebsiteSchema = z.object({
  templateId: z.string().min(1, "Choose a template."),
  name: z.string().trim().min(1, "Enter a website name.").max(60, "Use 60 characters or fewer."),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SUBDOMAIN_PATTERN, "Use 3–40 lowercase letters, numbers or hyphens."),
});
export type CreateWebsiteValues = z.infer<typeof createWebsiteSchema>;

export const editWebsiteSchema = z.object({
  name: z.string().trim().min(1, "Enter a website name.").max(60, "Use 60 characters or fewer."),
  paused: z.boolean(),
});
export type EditWebsiteValues = z.infer<typeof editWebsiteSchema>;
