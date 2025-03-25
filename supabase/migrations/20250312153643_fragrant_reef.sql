/*
  # Fix Complete Chore Function

  1. Changes
    - Update complete_chore function to properly return balance
    - Ensure atomic updates of chore status and balance
    - Add better error handling and validation

  2. Security
    - Maintain RLS policies
    - Ensure proper authorization checks
*/

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
  v_new_balance numeric;
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

  -- Start a transaction to ensure atomicity
  BEGIN
    -- Update chore status
    UPDATE chores
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = p_chore_id;

    -- Update child balance and get new balance
    UPDATE child_balances
    SET 
      amount = amount + v_chore_data.reward_amount,
      updated_at = now()
    WHERE child_id = v_chore_data.child_id
    RETURNING amount INTO v_new_balance;

    -- Build the result object
    SELECT jsonb_build_object(
      'chore', row_to_json(c.*),
      'balance', v_new_balance
    ) INTO v_result
    FROM chores c
    WHERE c.id = p_chore_id;

    -- If we got here, commit the transaction
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    -- If anything went wrong, the transaction will be rolled back
    RAISE;
  END;
END;
$$;