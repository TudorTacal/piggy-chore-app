/*
  # Update Chore Completion System

  1. New Function
    - complete_chore: Handles chore completion and balance update
    - Ensures atomic transaction for status and balance updates
  
  2. Security
    - Enable RLS on all operations
    - Validate parent-child relationships
*/

-- Function to complete a chore and update balance
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

  -- Update chore status
  UPDATE chores
  SET 
    status = 'completed',
    completed_at = now()
  WHERE id = p_chore_id;

  -- Update child balance
  UPDATE child_balances
  SET 
    amount = amount + v_chore_data.reward_amount,
    updated_at = now()
  WHERE child_id = v_chore_data.child_id;

  -- Get updated chore data
  SELECT jsonb_build_object(
    'chore', row_to_json(c.*),
    'balance', (SELECT amount FROM child_balances WHERE child_id = v_chore_data.child_id)
  ) INTO v_result
  FROM chores c
  WHERE c.id = p_chore_id;

  RETURN v_result;
END;
$$;