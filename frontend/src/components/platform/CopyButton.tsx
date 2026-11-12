"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { pushToast } from "@/features/ui/slice";
import { useAppDispatch } from "@/store/hooks";

/** Icon button that copies `value` to the clipboard and confirms with a tick + toast. */
export function CopyButton({ value, label, size = "md" }: { value: string; label: string; size?: "sm" | "md" }) {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      dispatch(pushToast({ tone: "info", title: "Copied", description: value.length > 60 ? `${value.slice(0, 57)}…` : value }));
    } catch {
      dispatch(pushToast({ tone: "error", title: "Couldn’t copy", description: "Select the text and copy it manually." }));
    }
  };
  return (
    <IconButton label={label} size={size} onClick={copy}>
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </IconButton>
  );
}
