-- Migration 039: agents table schema fixes
-- Fix 1: referral_code changed from NOT NULL UNIQUE (with default '') to NULL UNIQUE.
--         Multiple pending agents with referral_code='' would violate the UNIQUE constraint.
--         Pending agents get NULL; approved agents get a generated code.
-- Fix 2: Add suspension_reason TEXT NULL column.
--         Required by agent.suspended notification template ({{suspension_reason}}).

-- Step 1: Clear any existing '' empty-string referral codes (pending agents)
UPDATE agents SET referral_code = NULL WHERE referral_code = '';

-- Step 2: Drop the old UNIQUE constraint (tied to NOT NULL DEFAULT '')
ALTER TABLE agents
  DROP INDEX referral_code;

-- Step 3: Modify column to allow NULL
ALTER TABLE agents
  MODIFY COLUMN referral_code VARCHAR(20) NULL
    COMMENT 'NULL while pending; TGA-XXX999 format when approved';

-- Step 4: Re-add UNIQUE constraint that allows multiple NULLs (MySQL treats each NULL as distinct)
ALTER TABLE agents
  ADD UNIQUE INDEX uq_agent_referral_code (referral_code);

-- Step 5: Add suspension_reason column
ALTER TABLE agents
  ADD COLUMN suspension_reason TEXT NULL
    COMMENT 'Reason provided by admin when suspending the agent'
    AFTER rejected_reason;
