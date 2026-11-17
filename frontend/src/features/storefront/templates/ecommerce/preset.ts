/**
 * Default content shipped with the Aurelia template.
 *
 * Read exactly once — when a website is created — and deep-copied into that website's own rows.
 * Changing anything here affects new websites only; existing ones are never touched.
 */

export interface PresetSection {
  type: string;
  enabled?: boolean;
  settings: Record<string, unknown>;
}

export interface PresetPage {
  key: string;
  title: string;
  seo: { title: string; description: string };
  enabled?: boolean;
  sections?: PresetSection[];
  settings?: Record<string, unknown>;
}

const p = (name: string) => `/images/products/${name}.webp`;

export const ECOMMERCE_PRESET: { chrome: PresetSection[]; pages: PresetPage[] } = {
  chrome: [
    {
      type: "announcement_bar",
      settings: {
        message: "Free delivery on orders over ₹2,000 · 7-day returns, no questions",
        linkLabel: "Shop new arrivals",
        linkTarget: "/products",
      },
    },
    {
      type: "header",
      settings: {
        items: [
          { label: "Shop", target: "/shop" },
          { label: "All products", target: "/products" },
          { label: "Track order", target: "/track-order" },
        ],
        showSearch: true,
        ctaLabel: "Shop now",
        ctaTarget: "/products",
      },
    },
    {
      type: "footer",
      settings: {
        about: "Everyday pieces made in small batches with people we know by name. Shipped across India.",
        shopLinks: [
          { label: "All products", target: "/products" },
          { label: "New arrivals", target: "/products" },
          { label: "Best sellers", target: "/shop" },
        ],
        helpLinks: [
          { label: "Track your order", target: "/track-order" },
          { label: "Shipping & returns", target: "/shop" },
          { label: "Contact us", target: "/shop" },
        ],
        email: "hello@example.in",
        phone: "+91 98200 00000",
        note: "Prices include GST. Free delivery over ₹2,000.",
      },
    },
  ],
  pages: [
    {
      key: "landing",
      title: "Home",
      seo: { title: "Home", description: "Everyday pieces made well, in small batches, shipped across India." },
      sections: [
        {
          type: "hero",
          settings: {
            eyebrow: "New season",
            heading: "Made well. Kept long.",
            body: "Cotton, linen and leather from makers we visit. Nothing in this shop is designed to be replaced next year.",
            ctaLabel: "Shop the collection",
            ctaTarget: "/products",
            secondaryLabel: "Browse the shop",
            secondaryTarget: "/shop",
            image: p("linen-shirt"),
            layout: "split",
          },
        },
        {
          type: "featured_categories",
          settings: {
            heading: "Shop by category",
            subheading: "Five small collections, each one made with a single workshop.",
            limit: 4,
            layout: "grid",
          },
        },
        {
          type: "product_showcase",
          settings: {
            heading: "Featured this week",
            subheading: "Picked by us, restocked on Thursdays.",
            source: "featured",
            limit: 4,
            ctaLabel: "View all products",
            ctaTarget: "/products",
          },
        },
        {
          type: "promo_banner",
          settings: {
            eyebrow: "First order",
            heading: "10% off when you join the list",
            body: "One email a fortnight: new arrivals, restocks and the occasional note from the workshop.",
            ctaLabel: "Shop now",
            ctaTarget: "/products",
            image: p("leather-tote"),
            tone: "accent",
          },
        },
        {
          type: "product_showcase",
          settings: {
            heading: "Best sellers",
            subheading: "The pieces people come back for.",
            source: "bestsellers",
            limit: 4,
            ctaLabel: "See the full catalogue",
            ctaTarget: "/products",
          },
        },
        {
          type: "brand_intro",
          settings: {
            eyebrow: "Our story",
            heading: "Small batches, long lives",
            body: "We started in one room in Chennai with six t-shirts and a borrowed camera. Everything we sell is still made within a day's train ride, in quantities small enough that we know who made it.",
            image: p("ceramic-cups"),
            ctaLabel: "Read more",
            ctaTarget: "/shop",
            stats: [
              { value: "12", label: "Workshops we work with" },
              { value: "40k", label: "Orders delivered" },
              { value: "4.6", label: "Average rating" },
            ],
          },
        },
        {
          type: "testimonials",
          settings: {
            heading: "What customers say",
            items: [
              { quote: "The heavyweight tee is the only one I own that has not gone see-through at the shoulders.", author: "Ananya Iyer", location: "Bengaluru", rating: 5 },
              { quote: "Ordered on a Tuesday, wearing it on a Thursday. The linen shirt is perfect for Chennai heat.", author: "Fatima Sheikh", location: "Chennai", rating: 5 },
              { quote: "Beautiful stitching on the tote. You can tell the edges are finished by hand.", author: "Arjun Pillai", location: "Kochi", rating: 5 },
            ],
          },
        },
        {
          type: "newsletter",
          settings: {
            heading: "Join the list",
            body: "New arrivals, restocks and a note from the workshop. A fortnight apart, never more.",
            placeholder: "you@example.in",
            buttonLabel: "Subscribe",
            note: "No spam. Unsubscribe in one click.",
          },
        },
      ],
    },
    {
      key: "shop",
      title: "Shop",
      seo: { title: "Shop", description: "Browse new arrivals, best sellers and the full collection." },
      sections: [
        {
          type: "shop_hero",
          settings: {
            heading: "The shop",
            body: "Everything we make, grouped the way we think about it.",
            image: p("tee-sage"),
          },
        },
        {
          type: "featured_categories",
          settings: { heading: "Collections", subheading: "", limit: 5, layout: "feature" },
        },
        {
          type: "product_showcase",
          settings: { heading: "New arrivals", subheading: "Added in the last few weeks.", source: "new", limit: 4, ctaLabel: "All products", ctaTarget: "/products" },
        },
        {
          type: "product_showcase",
          settings: { heading: "Best sellers", subheading: "", source: "bestsellers", limit: 4, ctaLabel: "", ctaTarget: "" },
        },
        {
          type: "promo_banner",
          settings: {
            eyebrow: "On sale",
            heading: "End of season, up to 20% off",
            body: "A short list of pieces we are not making again this year.",
            ctaLabel: "Shop the sale",
            ctaTarget: "/products",
            image: p("sunglasses"),
            tone: "dark",
          },
        },
        {
          type: "newsletter",
          settings: {
            heading: "Hear it first",
            body: "Restocks sell out in a day. The list hears a few hours early.",
            placeholder: "you@example.in",
            buttonLabel: "Subscribe",
            note: "No spam. Unsubscribe in one click.",
          },
        },
      ],
    },
    {
      key: "products",
      title: "All products",
      seo: { title: "All products", description: "Search, filter and sort the full catalogue." },
      settings: {
        heading: "All products",
        intro: "Search, filter by category and sort by what matters to you.",
        showSearch: true,
        showFilters: true,
        perPage: 8,
      },
    },
    {
      key: "product",
      title: "Product details",
      seo: { title: "Product", description: "Product details, variants and reviews." },
      settings: {
        addToCartLabel: "Add to cart",
        showSpecs: true,
        showReviews: true,
        relatedHeading: "You may also like",
      },
    },
    {
      key: "cart",
      title: "Cart",
      seo: { title: "Your cart", description: "Review your items before checkout." },
      settings: {
        heading: "Your cart",
        emptyMessage: "Nothing here yet. Have a look at what is new.",
        checkoutLabel: "Proceed to checkout",
        freeShippingOver: 2000,
        shippingFee: 99,
      },
    },
    {
      key: "checkout",
      title: "Checkout",
      seo: { title: "Checkout", description: "Place your order." },
      settings: {
        heading: "Checkout",
        placeOrderLabel: "Place order",
        note: "Your details are only used for this order.",
      },
    },
    {
      key: "order",
      title: "Order confirmed",
      seo: { title: "Order confirmed", description: "Thank you for your order." },
      settings: {
        heading: "Thank you, your order is confirmed",
        message: "We have emailed the details. You can track the order any time with the number below.",
      },
    },
    {
      key: "payment",
      title: "Payment",
      seo: { title: "Payment", description: "Complete your payment." },
      settings: {
        heading: "Complete your payment",
        note: "Your order is held for 15 minutes while you pay.",
      },
    },
    {
      key: "login",
      title: "Sign in",
      seo: { title: "Sign in", description: "Sign in to your account." },
      settings: {
        heading: "Sign in",
        intro: "Sign in to check out faster and follow your orders.",
        submitLabel: "Sign in",
      },
    },
    {
      key: "register",
      title: "Create account",
      seo: { title: "Create account", description: "Open an account." },
      settings: {
        heading: "Create your account",
        intro: "One account for every order, address and return.",
        submitLabel: "Create account",
      },
    },
    {
      key: "account",
      title: "Your account",
      seo: { title: "Your account", description: "Your details and orders." },
      settings: {
        heading: "Your account",
        ordersHeading: "Your orders",
        emptyMessage: "You have not placed an order yet.",
      },
    },
    {
      key: "track",
      title: "Track order",
      seo: { title: "Track your order", description: "See where your order has reached." },
      settings: {
        heading: "Track your order",
        intro: "Enter the order number from your confirmation email and the email address you used.",
      },
    },
    {
      key: "reviews",
      title: "Reviews",
      seo: { title: "Reviews", description: "What customers think." },
      settings: {
        heading: "Customer reviews",
        writeLabel: "Write a review",
      },
    },
  ],
};
