DROP TABLE IF EXISTS website_delivery_methods;
DROP TABLE IF EXISTS website_payment_methods;
DROP TABLE IF EXISTS website_pages;
DROP TABLE IF EXISTS websites;

ALTER TABLE delivery_methods DROP CONSTRAINT IF EXISTS delivery_methods_id_tenant_key;
ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_id_tenant_key;
