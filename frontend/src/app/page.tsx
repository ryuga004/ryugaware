import type { Metadata } from "next";
import { LandingHeader } from "@/features/landing/components/LandingHeader";
import { FinalCta, Features, Hero, HowItWorks, LandingFooter, Pricing } from "@/features/landing/components/LandingSections";

export const metadata: Metadata = {
  title: { absolute: "Ryugaware: launch your online store on your own website" },
  description: "Pick a ready-made store template, add your products and start taking orders on your own web address. No code needed.",
};

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
