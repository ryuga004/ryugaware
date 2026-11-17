CREATE TABLE roles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL CHECK (btrim(name) <> ''),
    type            VARCHAR(50) NOT NULL CHECK (type IN ('owner', 'admin', 'member', 'custom')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (organization_id, name),
    UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX uq_roles_org_builtin_type
    ON roles (organization_id, type)
    WHERE type <> 'custom';

CREATE TABLE privileges (
    id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE CHECK (name ~ '^[a-z_]+[.][a-z_]+$'),
    type VARCHAR(50) NOT NULL
);

CREATE TABLE role_privileges (
    role_id      UUID NOT NULL REFERENCES roles(id)      ON DELETE CASCADE,
    privilege_id UUID NOT NULL REFERENCES privileges(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, privilege_id)
);

INSERT INTO privileges (name, type) VALUES
    ('websites.read',    'website'),
    ('websites.write',   'website'),
    ('websites.publish', 'website'),
    ('websites.delete',  'website'),
    ('domains.read',     'domain'),
    ('domains.manage',   'domain'),
    ('templates.read',   'template'),
    ('storage.read',     'storage'),
    ('storage.manage',   'storage'),
    ('delivery.read',    'delivery'),
    ('delivery.manage',  'delivery'),
    ('payments.read',    'payment'),
    ('payments.manage',  'payment'),
    ('customers.read',   'customer'),
    ('customers.manage', 'customer'),
    ('settings.read',    'setting'),
    ('settings.manage',  'setting'),
    ('users.read',       'user'),
    ('users.manage',     'user'),
    ('roles.read',       'role'),
    ('roles.manage',     'role'),
    ('audit.read',       'audit')
ON CONFLICT (name) DO NOTHING;
