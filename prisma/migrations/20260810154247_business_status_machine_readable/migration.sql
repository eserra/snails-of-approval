-- Convert snails.business_status from display labels to machine-readable values.
-- Display labels now live in lib/business-status.ts.
UPDATE "snails" SET "business_status" = 'active'
  WHERE "business_status" = 'Confirmed - In Business';

UPDATE "snails" SET "business_status" = 'permanently_closed'
  WHERE "business_status" = 'Permanently Closed';

UPDATE "snails" SET "business_status" = 'to_be_confirmed'
  WHERE "business_status" = 'TBC';
