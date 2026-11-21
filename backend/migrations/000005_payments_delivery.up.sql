CREATE TABLE payment_methods (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type         VARCHAR(20)  NOT NULL CHECK (type IN ('cod', 'upi', 'card')),
    provider     VARCHAR(20)  NOT NULL CHECK (provider IN ('offline', 'phonepe', 'paytm', 'gpay', 'razorpay')),
    display_name VARCHAR(80)  NOT NULL CHECK (btrim(display_name) <> ''),
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    test_mode    BOOLEAN      NOT NULL DEFAULT FALSE,
    fee_percent  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (fee_percent >= 0 AND fee_percent <= 100),
    fee_fixed    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee_fixed >= 0),
    min_order    NUMERIC(12,2) CHECK (min_order IS NULL OR min_order >= 0),
    max_order    NUMERIC(12,2) CHECK (max_order IS NULL OR max_order >= 0),
    key_id       VARCHAR(255),
    key_secret   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, type, provider),

    CONSTRAINT payment_methods_order_range_check
        CHECK (min_order IS NULL OR max_order IS NULL OR max_order >= min_order),
    CONSTRAINT payment_methods_cod_provider_check
        CHECK ((type = 'cod') = (provider = 'offline')),
    CONSTRAINT payment_methods_cod_no_keys_check
        CHECK (type <> 'cod' OR (key_id IS NULL AND key_secret IS NULL AND test_mode = FALSE)),
    CONSTRAINT payment_methods_order_limits_check
        CHECK (type = 'cod' OR (min_order IS NULL AND max_order IS NULL))
);

CREATE INDEX idx_payment_methods_tenant_enabled
    ON payment_methods (tenant_id, enabled);

CREATE TABLE delivery_methods (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name       VARCHAR(80)   NOT NULL CHECK (btrim(name) <> ''),
    partner    VARCHAR(20)   NOT NULL CHECK (partner IN ('shiprocket', 'self', 'pickup')),
    type       VARCHAR(20)   NOT NULL CHECK (type IN ('standard', 'express', 'same_day', 'pickup')),
    min_days   SMALLINT      NOT NULL DEFAULT 0 CHECK (min_days >= 0),
    max_days   SMALLINT      NOT NULL DEFAULT 0 CHECK (max_days >= 0),
    rate_type  VARCHAR(20)   NOT NULL CHECK (rate_type IN ('flat', 'free', 'free_above')),
    price      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    free_above NUMERIC(12,2) CHECK (free_above IS NULL OR free_above >= 0),
    coverage   VARCHAR(20)   NOT NULL CHECK (coverage IN ('all_india', 'metro', 'states', 'pincodes')),
    regions    JSONB         NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(regions) = 'array'),
    enabled    BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, name),

    CONSTRAINT delivery_methods_day_range_check
        CHECK (max_days >= min_days),
    CONSTRAINT delivery_methods_free_above_required_check
        CHECK ((rate_type = 'free_above') = (free_above IS NOT NULL)),
    CONSTRAINT delivery_methods_free_price_check
        CHECK (rate_type <> 'free' OR price = 0),
    CONSTRAINT delivery_methods_regions_coverage_check
        CHECK (coverage IN ('states', 'pincodes') OR regions = '[]'::jsonb),
    CONSTRAINT delivery_methods_pickup_partner_check
        CHECK ((type = 'pickup') = (partner = 'pickup'))
);

CREATE INDEX idx_delivery_methods_tenant_enabled
    ON delivery_methods (tenant_id, enabled);
