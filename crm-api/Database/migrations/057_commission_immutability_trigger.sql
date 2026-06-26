-- 057: Commission immutability trigger (defense-in-depth layer)
-- Prevents any UPDATE to paid commissions' financial fields
-- even if PHP application layer is bypassed (direct DB access, bug, etc.)

CREATE TRIGGER trg_commission_immutability
BEFORE UPDATE ON commissions
FOR EACH ROW
BEGIN
  -- Prevent reverting paid commissions to any other status
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Paid commissions cannot change status';
  END IF;

  -- Prevent editing financial fields on paid commissions
  IF OLD.status = 'paid' AND (
    NEW.amount     != OLD.amount OR
    NEW.percentage != OLD.percentage OR
    NEW.currency   != OLD.currency
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Financial fields on paid commissions are locked';
  END IF;

  -- Prevent reverting confirmed commissions back to pending
  IF OLD.status = 'confirmed' AND NEW.status = 'pending' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Confirmed commissions cannot revert to pending';
  END IF;

  -- Prevent editing financial fields on confirmed commissions
  IF OLD.status = 'confirmed' AND (
    NEW.amount     != OLD.amount OR
    NEW.percentage != OLD.percentage OR
    NEW.currency   != OLD.currency
  ) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'COMMISSION_IMMUTABLE: Financial fields on confirmed commissions are locked';
  END IF;
END;
