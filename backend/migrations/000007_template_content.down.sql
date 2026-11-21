UPDATE template_pages
SET variables = '{}'::jsonb,
    updated_at = now()
WHERE template_id = (SELECT id FROM templates WHERE slug = 'aurelia_commerce' AND tenant_id IS NULL);

ALTER TABLE templates DROP COLUMN IF EXISTS chrome;
