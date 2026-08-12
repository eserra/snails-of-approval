-- Contact.role (one string) -> Contact.roles (a list).
--
-- A person can hold several roles at once: a chef who is also the owner is one
-- contact, not two. A single column forced a choice, and combining values into
-- "chef_owner" would break role-based targeting — a segment matching "owner"
-- would silently skip them.
--
-- Written as add + backfill + drop rather than a rename, so existing values are
-- carried across instead of discarded.
--
-- "general" is dropped from the vocabulary rather than migrated. It was a
-- catch-all meaning "we don't know this person's role", and an empty list says
-- that honestly; keeping it would leave every historical contact filed under a
-- category no segment can use. Real roles are preserved as one-element lists.
ALTER TABLE "contacts" ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "contacts"
SET "roles" = CASE WHEN "role" = 'general' THEN ARRAY[]::TEXT[] ELSE ARRAY["role"] END;

ALTER TABLE "contacts" DROP COLUMN "role";
