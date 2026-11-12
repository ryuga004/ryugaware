import { z } from "zod";

const email = z.string().trim().min(1, "Enter your email.").email("Enter a valid email address.");

export const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name.").max(80, "Use 80 characters or fewer."),
  organizationName: z.string().trim().min(1, "Enter your organization name.").max(80, "Use 80 characters or fewer."),
  email,
  password: strongPassword,
  acceptTerms: z.boolean().refine((v) => v, { message: "Accept the Terms and Privacy Policy to continue." }),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: strongPassword, confirmPassword: z.string().min(1, "Confirm your new password.") })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don’t match." });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
