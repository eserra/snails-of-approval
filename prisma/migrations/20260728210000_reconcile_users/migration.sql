-- Reconcile Slow Food NYC user accounts onto the slowfoodnyc.org domain.
-- Idempotent: updates match by prior email; inserts skip on email conflict.
-- New users get a shared default password ("changeme123"); they should
-- change it on first login. Existing users' passwords are left untouched.

-- 1) Re-domain / rename existing users (and promote Laura & Matt to admin)
UPDATE "users" SET "email" = 'admin@slowfoodnyc.org'
  WHERE "email" = 'admin@snailsofapproval.org';
UPDATE "users" SET "email" = 'laura.hoffman@slowfoodnyc.org', "role" = 'admin'
  WHERE "email" = 'laura.hoffman@snailsofapproval.org';
UPDATE "users" SET "email" = 'matt.parker@slowfoodnyc.org', "name" = 'Matt Parker', "role" = 'admin'
  WHERE "email" = 'matt@snailsofapproval.org';
UPDATE "users" SET "email" = 'barbara.torasso@slowfoodnyc.org', "name" = 'Barbara Torasso'
  WHERE "email" = 'barbara@snailsofapproval.org';
UPDATE "users" SET "email" = 'kyle.karnuta@slowfoodnyc.org'
  WHERE "email" = 'kyle.karnuta@snailsofapproval.org';
UPDATE "users" SET "email" = 'karen.guzman@slowfoodnyc.org'
  WHERE "email" = 'karen.guzman@snailsofapproval.org';
UPDATE "users" SET "email" = 'richa.mehra@slowfoodnyc.org', "name" = 'Richa Mehra'
  WHERE "email" = 'richa@snailsofapproval.org';
UPDATE "users" SET "email" = 'edlin.choi@slowfoodnyc.org'
  WHERE "email" = 'edlin.choi@snailsofapproval.org';
UPDATE "users" SET "email" = 'charlie.marshall@slowfoodnyc.org'
  WHERE "email" = 'charlie.marshall@snailsofapproval.org';

-- 2) Create the new users (all editors, shared default password)
INSERT INTO "users" ("email", "password_hash", "name", "role")
VALUES
  ('anna.gorshkova@slowfoodnyc.org',  '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Anna Gorshkova',      'editor'),
  ('jason.hall@slowfoodnyc.org',      '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Jason Hall',          'editor'),
  ('melissa.flores@slowfoodnyc.org',  '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Melissa Flores',      'editor'),
  ('olivia.al@slowfoodnyc.org',       '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Olivia Al',           'editor'),
  ('whit.eidman@slowfoodnyc.org',     '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Whitney Eidman',      'editor'),
  ('bridgette.slater@slowfoodnyc.org','$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Bridgette Slater',    'editor'),
  ('kristen.kampetis@slowfoodnyc.org','$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Kristen Kampetis',    'editor'),
  ('elliot.epstein@slowfoodnyc.org',  '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Elliot Epstein',      'editor'),
  ('jen.gaily@slowfoodnyc.org',       '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Jen Gaily',           'editor'),
  ('katya.bloomberg@slowfoodnyc.org', '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Katya Bloomberg',     'editor'),
  ('marisa.malanga@slowfoodnyc.org',  '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Marisa Alia Malanga', 'editor'),
  ('philip.han@slowfoodnyc.org',      '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Philip Han',          'editor'),
  ('edoardo.serra@slowfoodnyc.org',   '$2b$12$4EfnQQqW.uZEdfO0.yeNEeJjUFYR4JAucslhA1kgHYRHjDv6zSf0y', 'Edoardo Serra',       'editor')
ON CONFLICT ("email") DO NOTHING;
