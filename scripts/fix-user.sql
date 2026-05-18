-- Admin-User Setup fuer lokale Supabase-Instanz
-- Fuehre dieses Script nach jedem "npx supabase start" aus wenn der User fehlt.
-- docker cp scripts/fix-user.sql supabase_db_auktivo:/tmp/fix-user.sql
-- docker exec supabase_db_auktivo psql -U postgres -d postgres -f /tmp/fix-user.sql

-- 1) User anlegen (falls nicht vorhanden)
INSERT INTO auth.users (
  id, email, email_confirmed_at, created_at, updated_at,
  aud, role, instance_id,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '76b60d81-4443-4995-9b5b-7d31fdf0a67c',
  'nikolaj.schefner@wamocon.com',
  NOW(), NOW(), NOW(),
  'authenticated', 'authenticated',
  '00000000-0000-0000-0000-000000000000',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nikolaj Schefner"}'
)
ON CONFLICT (id) DO NOTHING;

-- 2) GoTrue-Pflichtfelder setzen (aud, role, instance_id, Token-Felder)
UPDATE auth.users SET
  aud = 'authenticated',
  role = 'authenticated',
  instance_id = '00000000-0000-0000-0000-000000000000',
  encrypted_password = crypt('Auktivo2026!', gen_salt('bf', 10)),
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone = COALESCE(phone, ''),
  updated_at = NOW()
WHERE email = 'nikolaj.schefner@wamocon.com';

-- 3) Identity fuer Email-Provider
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '76b60d81-4443-4995-9b5b-7d31fdf0a67c',
  'nikolaj.schefner@wamocon.com',
  'email',
  '{"sub":"76b60d81-4443-4995-9b5b-7d31fdf0a67c","email":"nikolaj.schefner@wamocon.com","email_verified":true}',
  NOW(), NOW(), NOW()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 4) Admin-Profil setzen
INSERT INTO auktivo_dev.profiles (id, email, plan, is_admin)
VALUES ('76b60d81-4443-4995-9b5b-7d31fdf0a67c', 'nikolaj.schefner@wamocon.com', 'pro', true)
ON CONFLICT (id) DO UPDATE SET plan = 'pro', is_admin = true;

-- Ergebnis prüfen
SELECT u.email, u.aud, u.role, (u.encrypted_password IS NOT NULL) AS hat_passwort,
       p.plan, p.is_admin
FROM auth.users u
LEFT JOIN auktivo_dev.profiles p ON p.id = u.id
WHERE u.email = 'nikolaj.schefner@wamocon.com';
