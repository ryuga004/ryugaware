import Image from "next/image";
import { ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/** What shoppers see on the sign-in page, for the methods currently switched on in the form. */
export function AuthPreview({ emailOn, googleOn, websiteName }: { emailOn: boolean; googleOn: boolean; websiteName: string | null }) {
  if (!emailOn && !googleOn) {
    return (
      <div className="flex aspect-[8/5] w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-subtle px-6 text-center">
        <ShieldOff className="size-6 text-muted" aria-hidden />
        <p className="text-sm font-medium text-ink">No sign-in page</p>
        <p className="max-w-xs text-xs text-muted">Turn on a sign-in method. Without one, shoppers can only check out as guests.</p>
      </div>
    );
  }
  const google = googleOn;
  return (
    <figure className="flex max-w-[560px] flex-col gap-3">
      <Image
        src={google ? "/images/auth/preview-google.webp" : "/images/auth/preview-email.webp"}
        alt={google ? "Sign-in screen with a Continue with Google button above the email field" : "Sign-in screen with email and password fields"}
        width={960}
        height={600}
        sizes="(min-width: 640px) 560px, calc(100vw - 80px)"
        loading="eager"
        className="h-auto w-full rounded-card border border-line"
      />
      <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{websiteName ? `${websiteName} sign-in page shows:` : "Sign-in page shows:"}</span>
        {googleOn && <Badge>Continue with Google</Badge>}
        {emailOn && <Badge>Email and password</Badge>}
      </figcaption>
    </figure>
  );
}
