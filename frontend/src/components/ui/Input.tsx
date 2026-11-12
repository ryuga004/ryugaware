import { cn } from "@/lib/cn";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  /** Slot rendered inside the right edge (e.g. a show/hide button). */
  rightSlot?: React.ReactNode;
  /** Fixed text attached to the right (e.g. ".ryugaware.com"). */
  suffix?: string;
  mono?: boolean;
  inputSize?: "md" | "lg";
}

export function Input({
  invalid,
  leftIcon,
  rightSlot,
  suffix,
  mono,
  inputSize = "md",
  className,
  readOnly,
  disabled,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        "flex w-full items-stretch overflow-hidden rounded-md border bg-surface transition-shadow",
        inputSize === "md" ? "h-9" : "h-11",
        invalid ? "border-danger" : "border-line-strong",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ember/20",
        (readOnly || disabled) && "bg-subtle",
        disabled && "opacity-60",
        className,
      )}
    >
      {leftIcon && <span className="flex items-center pl-3 text-muted">{leftIcon}</span>}
      <input
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-faint",
          leftIcon && "pl-2",
          mono && "font-mono",
        )}
        {...props}
      />
      {rightSlot && <span className="flex items-center pr-1.5">{rightSlot}</span>}
      {suffix && (
        <span className="flex items-center border-l border-line-strong bg-subtle px-3 text-sm text-muted select-none">{suffix}</span>
      )}
    </div>
  );
}
