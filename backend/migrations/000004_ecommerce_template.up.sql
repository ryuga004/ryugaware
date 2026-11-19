INSERT INTO templates (
    tenant_id, category_id, slug, name, description,
    version, status, thumbnail_theme, preview_url, features, payment_methods, default_theme
)
SELECT
    NULL,
    c.id,
    'aurelia_commerce',
    'Aurelia Commerce',
    'Aurelia is a full e-commerce storefront: a landing page you arrange section by section, a shop with search, filters and sorting, product pages with variants and reviews, a working cart, a checkout with cash on delivery, and order tracking. Change the words, the pictures and the colours — the shopping itself already works.',
    '1.0.0',
    'published',
    'aurelia_commerce',
    NULL,
    '["Landing page with editable sections", "Search, filters and sorting", "Product variants and stock", "Cart and checkout", "Cash on delivery and UPI", "Order confirmation and tracking", "Customer reviews", "Responsive on every screen"]'::jsonb,
    '["Cash on delivery", "UPI"]'::jsonb,
    '{"brandName": "Aurelia", "brandDescription": "Everyday pieces made well, in small batches, for people who keep things a long time.", "logo": null, "primary": "#17352f", "secondary": "#c08a4e", "fontPair": "serif"}'::jsonb
FROM template_categories c
WHERE c.slug = 'ecommerce';

INSERT INTO template_pages (template_id, key, path, kind, sort_order)
SELECT t.id, p.key, p.path, p.kind, p.sort_order
FROM templates t
CROSS JOIN (VALUES
    ('landing',  '/',                       'content',  1),
    ('shop',     '/shop',                   'content',  2),
    ('products', '/products',               'system',   3),
    ('product',  '/products/:slug',         'system',   4),
    ('cart',     '/cart',                   'system',   5),
    ('checkout', '/checkout',               'system',   6),
    ('order',    '/orders/:orderNumber',    'system',   7),
    ('payment',  '/pay/:orderNumber',       'system',   8),
    ('login',    '/account/login',          'system',   9),
    ('register', '/account/register',       'system',  10),
    ('account',  '/account',                'system',  11),
    ('track',    '/track-order',            'system',  12),
    ('reviews',  '/products/:slug/reviews', 'system',  13)
) AS p(key, path, kind, sort_order)
WHERE t.tenant_id IS NULL AND t.slug = 'aurelia_commerce';
