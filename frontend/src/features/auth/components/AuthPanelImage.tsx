"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/** One photograph per auth flow: sign in / recovery, sign up / verify, and new password. */
function panelFor(pathname: string) {
  if (pathname.startsWith("/register") || pathname.startsWith("/verify-email")) return 2;
  if (pathname.startsWith("/reset-password")) return 3;
  return 1;
}

export function AuthPanelImage() {
  const panel = panelFor(usePathname());
  return (
    <>
      {/* Panel 2 is device cards on a plain dark field: start it lower so the cards clear the headline. */}
      <div className={panel === 2 ? "absolute inset-x-0 top-[36%] bottom-0" : "absolute inset-0"}>
        <Image
          key={panel}
          src={`/images/auth/panel-${panel}.webp`}
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 560px, 0px"
          quality={85}
          className={panel === 2 ? "object-cover object-[center_92%]" : "object-cover object-bottom"}
        />
      </div>
      {/* Flat scrim (no gradient): the top of every photo is already dark, this only evens it out. */}
      <div aria-hidden className="absolute inset-0 bg-ink/25" />
    </>
  );
}
