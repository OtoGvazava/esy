-- A dedicated account for the visual check, so the run never depends on — or
-- modifies — a real person's roles and memberships.
--
-- It needs both permission axes at once, because they gate different hosts:
-- the platform ADMIN role opens admin.esy.ge, and an OWNER membership opens
-- manager.esy.ge for one store. Being an admin grants nothing inside a store
-- (D6), which is exactly why both are required rather than one.
--
-- Targets `fashion` because it actually has products; an empty store makes
-- every grid look like a layout regression.
--
--   docker compose exec -T db psql -U esy -d esy < apps/web/scripts/seed-visual.sql

INSERT INTO users (username, email, is_active, first_name, last_name)
SELECT 'visual-check@esy.test', 'visual-check@esy.test', true, 'Visual', 'Check'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'visual-check@esy.test');

INSERT INTO roles (name, description)
SELECT 'ADMIN', 'Administrator role'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'visual-check@esy.test' AND r.name = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO store_memberships (user_id, tenant_id, role)
SELECT u.id, t.id, 'OWNER'
FROM users u, tenants t
WHERE u.username = 'visual-check@esy.test' AND t.subdomain = 'fashion'
  AND NOT EXISTS (
    SELECT 1 FROM store_memberships sm WHERE sm.user_id = u.id AND sm.tenant_id = t.id);

SELECT u.username,
       (SELECT string_agg(r.name, ',') FROM user_roles ur JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = u.id) AS platform_roles,
       (SELECT string_agg(t.subdomain || ':' || sm.role, ',') FROM store_memberships sm
          JOIN tenants t ON t.id = sm.tenant_id WHERE sm.user_id = u.id) AS store_roles
FROM users u WHERE u.username = 'visual-check@esy.test';
