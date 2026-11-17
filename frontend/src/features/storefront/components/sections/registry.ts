/**
 * Section type → component. The renderer looks a section up here; an unknown type is skipped
 * instead of crashing the page, so a website pinned to an older template version keeps working.
 */
import type { SiteSection } from "../../types";
import { AnnouncementBar, Footer, Header } from "./chrome";
import { BrandIntro, FeaturedCategories, Hero, Newsletter, ProductShowcase, PromoBanner, RichText, ShopHero, Testimonials } from "./blocks";

export type SectionComponent = React.ComponentType<{ section: SiteSection }>;

export const SECTION_COMPONENTS: Record<string, SectionComponent> = {
  announcement_bar: AnnouncementBar,
  header: Header,
  footer: Footer,
  hero: Hero,
  shop_hero: ShopHero,
  featured_categories: FeaturedCategories,
  product_showcase: ProductShowcase,
  promo_banner: PromoBanner,
  brand_intro: BrandIntro,
  testimonials: Testimonials,
  newsletter: Newsletter,
  rich_text: RichText,
};
