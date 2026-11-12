import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-subtle",
  ghost: "text-ink-700 hover:bg-subtle",
  danger: "bg-danger text-white hover:bg-danger-hover",
  dangerGhost: "text-danger hover:bg-danger-bg",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name (also used as the tooltip). */
  label: string;
  danger?: boolean;
  size?: "sm" | "md";
}

export function IconButton({ label, danger, size = "md", className, children, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "size-8" : "size-7",
        danger ? "hover:bg-danger-bg hover:text-danger" : "hover:bg-subtle hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant | "cream" | "darkOutline";
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const LINK_VARIANTS: Record<string, string> = {
  ...VARIANTS,
  cream: "bg-page text-ink hover:bg-white",
  darkOutline: "border border-ink-700 text-page hover:bg-ink-800",
};

/** A link that looks like a Button (navigation, not an action). */
export function ButtonLink({ variant = "primary", size = "md", fullWidth, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors",
        LINK_VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
}
