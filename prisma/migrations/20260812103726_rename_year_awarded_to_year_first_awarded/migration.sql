-- Rename year_awarded -> year_first_awarded.
--
-- The column always meant "the year this business first held a Snail", but its
-- old name read as "the year of the award that is currently in force", which is
-- a different fact with a different lifecycle (it recurs at every
-- recertification). RENAME COLUMN preserves the existing values; a drop-and-add
-- would discard them.
ALTER TABLE "snails" RENAME COLUMN "year_awarded" TO "year_first_awarded";
