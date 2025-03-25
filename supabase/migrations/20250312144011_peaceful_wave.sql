/*
  # Fix Balance Handling

  1. Changes
    - Remove balance column from users table
    - Add trigger for balance updates
    - Add function to handle balance updates
  
  2. Security
    - Ensure balance updates are atomic
    - Maintain data consistency
*/

-- Remove balance column from users as it's not needed
ALTER TABLE users DROP COLUMN IF EXISTS balance;

-- Create a trigger function to handle balance updates
CREATE OR REPLACE FUNCTION handle_chore_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is changing to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update child balance
    UPDATE child_balances
    SET 
      amount = amount + NEW.reward_amount,
      updated_at = now()
    WHERE child_id = NEW.child_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for chore completion
DROP TRIGGER IF EXISTS on_chore_completion ON chores;
CREATE TRIGGER on_chore_completion
  BEFORE UPDATE ON chores
  FOR EACH ROW
  EXECUTE FUNCTION handle_chore_completion();

-- Update complete_chore function to return more detailed information
CREATE OR REPLACE FUNCTION complete_chore(
  p_chore_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chore_data record;
  v_child_id uuid;
  v_result jsonb;
BEGIN
  -- Get chore data and validate ownership
  SELECT c.*, ch.id as child_id
  INTO v_chore_data
  FROM chores c
  JOIN children ch ON c.child_id = ch.id
  JOIN parent_child_relationships pcr ON ch.id = pcr.child_id
  WHERE c.id = p_chore_id
    AND pcr.parent_id = p_user_id
    AND c.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore not found or not authorized';
  END IF;

  -- Update chore status (this will trigger the balance update)
  UPDATE chores
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = p_chore_id;

  -- Get updated data
  WITH updated_data AS (
    SELECT 
      c.*,
      cb.amount as current_balance
    FROM chores c
    JOIN child_balances cb ON c.child_id = cb.child_id
    WHERE c.id = p_chore_id
  )
  SELECT jsonb_build_object(
    'chore', row_to_json(updated_data.*),
    'balance', updated_data.current_balance
  ) INTO v_result
  FROM updated_data;

  RETURN v_result;
END;
$$;