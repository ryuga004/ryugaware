ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_id_tenant_key UNIQUE (id, tenant_id);
ALTER TABLE delivery_methods ADD CONSTRAINT delivery_methods_id_tenant_key UNIQUE (id, tenant_id);

CREATE TABLE websites (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id      UUID         NOT NULL REFERENCES templates(id) ON DELETE NO ACTION,
    template_version VARCHAR(20)  NOT NULL DEFAULT '',
    name             VARCHAR(80)  NOT NULL CHECK (btrim(name) <> ''),
    subdomain        VARCHAR(63)  NOT NULL UNIQUE
                                  CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
                                         AND char_length(subdomain) BETWEEN 3 AND 63),
    custom_domain    VARCHAR(253) UNIQUE,
    status           VARCHAR(20)  NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft', 'live', 'paused')),
    storage_prefix   TEXT         NOT NULL CHECK (storage_prefix LIKE 't/%/w/%/'),
    theme            JSONB        NOT NULL DEFAULT '{}'::jsonb
                                  CHECK (jsonb_typeof(theme) = 'object'),
    chrome           JSONB        NOT NULL DEFAULT '[]'::jsonb
                                  CHECK (jsonb_typeof(chrome) = 'array'),
    created_by       UUID         REFERENCES platform_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at     TIMESTAMPTZ,

    UNIQUE (tenant_id, name),
    UNIQUE (id, tenant_id),

    CONSTRAINT websites_published_when_live_check
        CHECK (status <> 'live' OR published_at IS NOT NULL)
);

CREATE INDEX idx_websites_tenant_status ON websites (tenant_id, status);

CREATE TABLE website_pages (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID         NOT NULL,
    tenant_id  UUID         NOT NULL,
    key        VARCHAR(50)  NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]*$'),
    path       VARCHAR(200) NOT NULL CHECK (path LIKE '/%'),
    kind       VARCHAR(20)  NOT NULL CHECK (kind IN ('content', 'system')),
    title      VARCHAR(120) NOT NULL DEFAULT '',
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order SMALLINT     NOT NULL DEFAULT 0,
    seo        JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(seo) = 'object'),
    sections   JSONB        NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array'),
    settings   JSONB        NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (website_id, key),

    CONSTRAINT website_pages_website_same_tenant_fkey
        FOREIGN KEY (website_id, tenant_id)
        REFERENCES websites (id, tenant_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_website_pages_website_order ON website_pages (website_id, sort_order);

CREATE TABLE website_payment_methods (
    website_id        UUID        NOT NULL,
    payment_method_id UUID        NOT NULL,
    tenant_id         UUID        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (website_id, payment_method_id),

    CONSTRAINT website_payment_methods_website_fkey
        FOREIGN KEY (website_id, tenant_id)
        REFERENCES websites (id, tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT website_payment_methods_method_fkey
        FOREIGN KEY (payment_method_id, tenant_id)
        REFERENCES payment_methods (id, tenant_id)
        ON DELETE CASCADE
);

CREATE TABLE website_delivery_methods (
    website_id         UUID        NOT NULL,
    delivery_method_id UUID        NOT NULL,
    tenant_id          UUID        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (website_id, delivery_method_id),

    CONSTRAINT website_delivery_methods_website_fkey
        FOREIGN KEY (website_id, tenant_id)
        REFERENCES websites (id, tenant_id)
        ON DELETE CASCADE,
    CONSTRAINT website_delivery_methods_method_fkey
        FOREIGN KEY (delivery_method_id, tenant_id)
        REFERENCES delivery_methods (id, tenant_id)
        ON DELETE CASCADE
);
