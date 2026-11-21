ALTER TABLE templates
    ADD COLUMN chrome JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(chrome) = 'array');

UPDATE templates
SET chrome = $preset$[{"type": "announcement_bar", "enabled": true, "settings": {"message": "Free delivery on orders over ₹2,000 · 7-day returns, no questions", "linkLabel": "Shop new arrivals", "linkTarget": "/products"}}, {"type": "header", "enabled": true, "settings": {"items": [{"label": "Shop", "target": "/shop"}, {"label": "All products", "target": "/products"}, {"label": "Track order", "target": "/track-order"}], "showSearch": true, "ctaLabel": "Shop now", "ctaTarget": "/products"}}, {"type": "footer", "enabled": true, "settings": {"about": "Everyday pieces made in small batches with people we know by name. Shipped across India.", "shopLinks": [{"label": "All products", "target": "/products"}, {"label": "New arrivals", "target": "/products"}, {"label": "Best sellers", "target": "/shop"}], "helpLinks": [{"label": "Track your order", "target": "/track-order"}, {"label": "Shipping & returns", "target": "/shop"}, {"label": "Contact us", "target": "/shop"}], "email": "hello@example.in", "phone": "+91 98200 00000", "note": "Prices include GST. Free delivery over ₹2,000."}}]$preset$::jsonb,
    updated_at = now()
WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL;

UPDATE template_pages
SET variables = $preset${"title": "Home", "label": "Landing page", "description": "The home page. Arrange its sections freely.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Home", "description": "Everyday pieces made well, in small batches, shipped across India."}, "sections": [{"type": "hero", "enabled": true, "settings": {"eyebrow": "New season", "heading": "Made well. Kept long.", "body": "Cotton, linen and leather from makers we visit. Nothing in this shop is designed to be replaced next year.", "ctaLabel": "Shop the collection", "ctaTarget": "/products", "secondaryLabel": "Browse the shop", "secondaryTarget": "/shop", "image": "/images/products/linen-shirt.webp", "layout": "split"}}, {"type": "featured_categories", "enabled": true, "settings": {"heading": "Shop by category", "subheading": "Five small collections, each one made with a single workshop.", "limit": 4, "layout": "grid"}}, {"type": "product_showcase", "enabled": true, "settings": {"heading": "Featured this week", "subheading": "Picked by us, restocked on Thursdays.", "source": "featured", "limit": 4, "ctaLabel": "View all products", "ctaTarget": "/products"}}, {"type": "promo_banner", "enabled": true, "settings": {"eyebrow": "First order", "heading": "10% off when you join the list", "body": "One email a fortnight: new arrivals, restocks and the occasional note from the workshop.", "ctaLabel": "Shop now", "ctaTarget": "/products", "image": "/images/products/leather-tote.webp", "tone": "accent"}}, {"type": "product_showcase", "enabled": true, "settings": {"heading": "Best sellers", "subheading": "The pieces people come back for.", "source": "bestsellers", "limit": 4, "ctaLabel": "See the full catalogue", "ctaTarget": "/products"}}, {"type": "brand_intro", "enabled": true, "settings": {"eyebrow": "Our story", "heading": "Small batches, long lives", "body": "We started in one room in Chennai with six t-shirts and a borrowed camera. Everything we sell is still made within a day's train ride, in quantities small enough that we know who made it.", "image": "/images/products/ceramic-cups.webp", "ctaLabel": "Read more", "ctaTarget": "/shop", "stats": [{"value": "12", "label": "Workshops we work with"}, {"value": "40k", "label": "Orders delivered"}, {"value": "4.6", "label": "Average rating"}]}}, {"type": "testimonials", "enabled": true, "settings": {"heading": "What customers say", "items": [{"quote": "The heavyweight tee is the only one I own that has not gone see-through at the shoulders.", "author": "Ananya Iyer", "location": "Bengaluru", "rating": 5}, {"quote": "Ordered on a Tuesday, wearing it on a Thursday. The linen shirt is perfect for Chennai heat.", "author": "Fatima Sheikh", "location": "Chennai", "rating": 5}, {"quote": "Beautiful stitching on the tote. You can tell the edges are finished by hand.", "author": "Arjun Pillai", "location": "Kochi", "rating": 5}]}}, {"type": "newsletter", "enabled": true, "settings": {"heading": "Join the list", "body": "New arrivals, restocks and a note from the workshop. A fortnight apart, never more.", "placeholder": "you@example.in", "buttonLabel": "Subscribe", "note": "No spam. Unsubscribe in one click."}}], "settings": {}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'landing';

UPDATE template_pages
SET variables = $preset${"title": "Shop", "label": "Shop home", "description": "A second landing page for browsing, between the home page and the full catalogue.", "required": false, "governedBy": null, "enabled": true, "seo": {"title": "Shop", "description": "Browse new arrivals, best sellers and the full collection."}, "sections": [{"type": "shop_hero", "enabled": true, "settings": {"heading": "The shop", "body": "Everything we make, grouped the way we think about it.", "image": "/images/products/tee-sage.webp"}}, {"type": "featured_categories", "enabled": true, "settings": {"heading": "Collections", "subheading": "", "limit": 5, "layout": "feature"}}, {"type": "product_showcase", "enabled": true, "settings": {"heading": "New arrivals", "subheading": "Added in the last few weeks.", "source": "new", "limit": 4, "ctaLabel": "All products", "ctaTarget": "/products"}}, {"type": "product_showcase", "enabled": true, "settings": {"heading": "Best sellers", "subheading": "", "source": "bestsellers", "limit": 4, "ctaLabel": "", "ctaTarget": ""}}, {"type": "promo_banner", "enabled": true, "settings": {"eyebrow": "On sale", "heading": "End of season, up to 20% off", "body": "A short list of pieces we are not making again this year.", "ctaLabel": "Shop the sale", "ctaTarget": "/products", "image": "/images/products/sunglasses.webp", "tone": "dark"}}, {"type": "newsletter", "enabled": true, "settings": {"heading": "Hear it first", "body": "Restocks sell out in a day. The list hears a few hours early.", "placeholder": "you@example.in", "buttonLabel": "Subscribe", "note": "No spam. Unsubscribe in one click."}}], "settings": {}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'shop';

UPDATE template_pages
SET variables = $preset${"title": "All products", "label": "Product listing", "description": "The full catalogue with search, category filters, price filter and sorting.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "All products", "description": "Search, filter and sort the full catalogue."}, "sections": [], "settings": {"heading": "All products", "intro": "Search, filter by category and sort by what matters to you.", "showSearch": true, "showFilters": true, "perPage": 8}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'products';

UPDATE template_pages
SET variables = $preset${"title": "Product details", "label": "Product details", "description": "Gallery, variants, stock, description, specifications and related products.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Product", "description": "Product details, variants and reviews."}, "sections": [], "settings": {"addToCartLabel": "Add to cart", "showSpecs": true, "showReviews": true, "relatedHeading": "You may also like"}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'product';

UPDATE template_pages
SET variables = $preset${"title": "Cart", "label": "Cart", "description": "Quantities, removal, subtotal, shipping estimate and the way to checkout.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Your cart", "description": "Review your items before checkout."}, "sections": [], "settings": {"heading": "Your cart", "emptyMessage": "Nothing here yet. Have a look at what is new.", "checkoutLabel": "Proceed to checkout", "freeShippingOver": 2000, "shippingFee": 99}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'cart';

UPDATE template_pages
SET variables = $preset${"title": "Checkout", "label": "Checkout", "description": "Contact details, address, shipping method, payment method and order summary.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Checkout", "description": "Place your order."}, "sections": [], "settings": {"heading": "Checkout", "placeOrderLabel": "Place order", "note": "Your details are only used for this order."}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'checkout';

UPDATE template_pages
SET variables = $preset${"title": "Order confirmed", "label": "Order confirmation", "description": "The thank-you page with the order number, items and delivery estimate.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Order confirmed", "description": "Thank you for your order."}, "sections": [], "settings": {"heading": "Thank you, your order is confirmed", "message": "We have emailed the details. You can track the order any time with the number below."}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'order';

UPDATE template_pages
SET variables = $preset${"title": "Payment", "label": "Payment", "description": "Where the shopper pays for an order before it is confirmed.", "required": true, "governedBy": null, "enabled": true, "seo": {"title": "Payment", "description": "Complete your payment."}, "sections": [], "settings": {"heading": "Complete your payment", "note": "Your order is held for 15 minutes while you pay."}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'payment';

UPDATE template_pages
SET variables = $preset${"title": "Sign in", "label": "Sign in", "description": "Where returning shoppers sign in.", "required": false, "governedBy": "signIn", "enabled": true, "seo": {"title": "Sign in", "description": "Sign in to your account."}, "sections": [], "settings": {"heading": "Sign in", "intro": "Sign in to check out faster and follow your orders.", "submitLabel": "Sign in"}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'login';

UPDATE template_pages
SET variables = $preset${"title": "Create account", "label": "Create account", "description": "Where a new shopper opens an account.", "required": false, "governedBy": "signIn", "enabled": true, "seo": {"title": "Create account", "description": "Open an account."}, "sections": [], "settings": {"heading": "Create your account", "intro": "One account for every order, address and return.", "submitLabel": "Create account"}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'register';

UPDATE template_pages
SET variables = $preset${"title": "Your account", "label": "Customer account", "description": "A shopper's own page: their details and every order they have placed.", "required": false, "governedBy": "signIn", "enabled": true, "seo": {"title": "Your account", "description": "Your details and orders."}, "sections": [], "settings": {"heading": "Your account", "ordersHeading": "Your orders", "emptyMessage": "You have not placed an order yet."}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'account';

UPDATE template_pages
SET variables = $preset${"title": "Track order", "label": "Track order", "description": "Order lookup with a delivery timeline. Optional.", "required": false, "governedBy": null, "enabled": true, "seo": {"title": "Track your order", "description": "See where your order has reached."}, "sections": [], "settings": {"heading": "Track your order", "intro": "Enter the order number from your confirmation email and the email address you used."}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'track';

UPDATE template_pages
SET variables = $preset${"title": "Reviews", "label": "Product reviews", "description": "Full review list with ratings and a form to add one. Optional.", "required": false, "governedBy": null, "enabled": true, "seo": {"title": "Reviews", "description": "What customers think."}, "sections": [], "settings": {"heading": "Customer reviews", "writeLabel": "Write a review"}}$preset$::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL)
  AND key = 'reviews';
