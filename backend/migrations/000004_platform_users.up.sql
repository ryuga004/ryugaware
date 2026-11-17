CREATE TABLE platform_users (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id             UUID         NOT NULL,
    full_name           VARCHAR(80)  NOT NULL CHECK (btrim(full_name) <> ''),
    email               CITEXT       NOT NULL UNIQUE
                                     CHECK (char_length(email) <= 254
                                            AND email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
    password_hash       VARCHAR(255) NOT NULL,
    email_verified_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT platform_users_role_same_org_fkey
        FOREIGN KEY (role_id, organization_id)
        REFERENCES roles (id, organization_id)
        ON DELETE NO ACTION
);
