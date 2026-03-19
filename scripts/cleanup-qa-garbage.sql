-- Cleanup QA garbage data from prototype sessions
-- These proposals were created during worktree prototype QA runs at localhost:3003
-- Run against Main DB only (dcqfuqjqmqrzycyvutkn)

-- Preview what will be deleted
SELECT id, title, created_at
FROM proposals
WHERE title LIKE '%localhost:3003%'
   OR summary LIKE '%localhost:3003%'
   OR body LIKE '%localhost:3003%';

-- Delete comments on garbage proposals first (FK constraint)
DELETE FROM proposal_comments
WHERE proposal_id IN (
  SELECT id FROM proposals
  WHERE title LIKE '%localhost:3003%'
     OR summary LIKE '%localhost:3003%'
     OR body LIKE '%localhost:3003%'
);

-- Delete proposal versions
DELETE FROM proposal_versions
WHERE proposal_id IN (
  SELECT id FROM proposals
  WHERE title LIKE '%localhost:3003%'
     OR summary LIKE '%localhost:3003%'
     OR body LIKE '%localhost:3003%'
);

-- Delete the garbage proposals
DELETE FROM proposals
WHERE title LIKE '%localhost:3003%'
   OR summary LIKE '%localhost:3003%'
   OR body LIKE '%localhost:3003%';
