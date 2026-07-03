-- Migration: 035_budget_payment_status.sql
-- Payment status + avans (deposit) on manual budget items

ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS avans numeric(10, 2);

ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'unpaid';

ALTER TABLE budget_items
  DROP CONSTRAINT IF EXISTS budget_items_status_check;

ALTER TABLE budget_items
  ADD CONSTRAINT budget_items_status_check
  CHECK (status IN ('unpaid', 'deposit_paid', 'fully_paid'));

UPDATE budget_items
  SET status = 'unpaid'
  WHERE status NOT IN ('unpaid', 'deposit_paid', 'fully_paid');
