"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/Button";

/** Password field with a show/hide toggle. Accepts all Input props (including react-hook-form `register`). */
export function PasswordInput(props: Omit<InputProps, "type" | "rightSlot">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      rightSlot={
        <IconButton label={visible ? "Hide password" : "Show password"} size="sm" onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </IconButton>
      }
    />
  );
}
