-- Convert snails.stage from display labels to machine-readable values.
-- Display labels now live in lib/pipeline-stages.ts.
--
-- "Voted" becomes "board_review": a snail sits in this stage *awaiting* the
-- board's vote, and recording the decision moves it straight on to onboarding
-- or deferred, so the old name described a state it had already left.
UPDATE "snails" SET "stage" = 'new'                WHERE "stage" = 'New';
UPDATE "snails" SET "stage" = 'contacted'          WHERE "stage" = 'Contacted';
UPDATE "snails" SET "stage" = 'applied'            WHERE "stage" = 'Applied';
UPDATE "snails" SET "stage" = 'visited'            WHERE "stage" = 'Visited';
UPDATE "snails" SET "stage" = 'board_review'       WHERE "stage" = 'Voted';
UPDATE "snails" SET "stage" = 'onboarding'         WHERE "stage" = 'Onboarding';
UPDATE "snails" SET "stage" = 'active'             WHERE "stage" = 'Active';
UPDATE "snails" SET "stage" = 'renewal_due'        WHERE "stage" = 'Renewal Due';
UPDATE "snails" SET "stage" = 'renewal_submitted'  WHERE "stage" = 'Renewal Submitted';
UPDATE "snails" SET "stage" = 'lapsed'             WHERE "stage" = 'Lapsed';
UPDATE "snails" SET "stage" = 'deferred'           WHERE "stage" = 'Deferred';
UPDATE "snails" SET "stage" = 'blocked'            WHERE "stage" = 'Blocked';
