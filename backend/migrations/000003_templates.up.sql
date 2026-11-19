CREATE TABLE template_categories (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       VARCHAR(50) NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
    name       VARCHAR(80) NOT NULL CHECK (btrim(name) <> ''),
    sort_order SMALLINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO template_categories (id, slug, name, sort_order) VALUES
    ('00000000-0000-0000-0001-000000000001', 'ecommerce',     'Ecommerce',         1),
    ('00000000-0000-0000-0001-000000000002', 'food_delivery', 'Food delivery',     2),
    ('00000000-0000-0000-0001-000000000003', 'restaurant',    'Restaurant & cafe', 3),
    ('00000000-0000-0000-0001-000000000004', 'services',      'Services',          4),
    ('00000000-0000-0000-0001-000000000005', 'portfolio',     'Portfolio',         5),
    ('00000000-0000-0000-0001-000000000006', 'education',     'Education',         6);

CREATE TABLE templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        REFERENCES tenants(id) ON DELETE CASCADE,
    category_id     UUID        NOT NULL REFERENCES template_categories(id) ON DELETE NO ACTION,
    slug            VARCHAR(50) NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
    name            VARCHAR(80) NOT NULL CHECK (btrim(name) <> ''),
    description     TEXT        NOT NULL DEFAULT '',
    version         VARCHAR(20) NOT NULL DEFAULT '1.0.0' CHECK (btrim(version) <> ''),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('published', 'draft')),
    thumbnail_theme VARCHAR(50) NOT NULL DEFAULT '',
    preview_url     TEXT,
    features        JSONB       NOT NULL DEFAULT '[]'::jsonb
                                CHECK (jsonb_typeof(features) = 'array'),
    payment_methods JSONB       NOT NULL DEFAULT '[]'::jsonb
                                CHECK (jsonb_typeof(payment_methods) = 'array'),
    default_theme   JSONB       NOT NULL DEFAULT '{}'::jsonb
                                CHECK (jsonb_typeof(default_theme) = 'object'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, slug)
);

CREATE UNIQUE INDEX uq_templates_platform_slug
    ON templates (slug)
    WHERE tenant_id IS NULL;

CREATE TABLE template_pages (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID         NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    key         VARCHAR(50)  NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]*$'),
    path        VARCHAR(200) NOT NULL CHECK (path LIKE '/%'),
    kind        VARCHAR(20)  NOT NULL CHECK (kind IN ('content', 'system')),
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    variables   JSONB        NOT NULL DEFAULT '{}'::jsonb
                             CHECK (jsonb_typeof(variables) = 'object'),
    preview_url TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (template_id, key),
    UNIQUE (id, template_id)
);

CREATE TABLE template_assets (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID         NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    page_id     UUID,
    key         VARCHAR(50)  NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]*$'),
    kind        VARCHAR(20)  NOT NULL DEFAULT 'image'
                             CHECK (kind IN ('image', 'icon', 'video', 'document')),
    default_url TEXT         NOT NULL CHECK (btrim(default_url) <> ''),
    alt_text    VARCHAR(160) NOT NULL DEFAULT '',
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT template_assets_page_same_template_fkey
        FOREIGN KEY (page_id, template_id)
        REFERENCES template_pages (id, template_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_template_assets_page_key
    ON template_assets (page_id, key)
    WHERE page_id IS NOT NULL;

CREATE UNIQUE INDEX uq_template_assets_template_key
    ON template_assets (template_id, key)
    WHERE page_id IS NULL;
