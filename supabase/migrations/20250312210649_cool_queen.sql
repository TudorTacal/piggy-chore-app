/*
  # Fix Chore Completion Authorization

  1. Changes
    - Improve parent authorization check
    - Fix transaction handling
    - Add better error messages
    - Handle null balances properly

  2. Security
    - Maintain RLS policies
    - Ensure proper parent-child relationship validation
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
  v_previous_balance numeric;
  v_result jsonb;
BEGIN
  -- Get chore data and validate ownership with explicit parent check
  SELECT 
    c.*,
    ch.id as child_id,
    COALESCE(cb.amount, 0) as current_balance
  INTO v_chore_data
  FROM chores c
  JOIN children ch ON c.child_id = ch.id
  JOIN parent_child_relationships pcr ON ch.id = pcr.child_id AND pcr.parent_id = p_user_id
  LEFT JOIN child_balances cb ON ch.id = cb.child_id
  WHERE c.id = p_chore_id
    AND c.status = 'pending';

  IF v_chore_data IS NULL THEN
    RAISE EXCEPTION 'Chore not found or not authorized';
  END IF;

  -- Store previous balance
  v_previous_balance := v_chore_data.current_balance;

  -- Start a transaction
  BEGIN
    -- Update chore status
    UPDATE chores
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = p_chore_id
    RETURNING * INTO v_chore_data;

    -- Create or update child balance
    INSERT INTO child_balances (child_id, amount)
    VALUES (v_chore_data.child_id, v_chore_data.reward_amount)
    ON CONFLICT (child_id) 
    DO UPDATE SET 
      amount = EXCLUDED.amount + child_balances.amount,
      updated_at = now()
    RETURNING amount INTO v_new_balance;

    -- Build the result object with complete information
    SELECT jsonb_build_object(
      'chore', row_to_json(v_chore_data),
      'balance', v_new_balance,
      'previous_balance', v_previous_balance,
      'reward_amount', v_chore_data.reward_amount
    ) INTO v_result;

    RETURN v_result;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to complete chore: %', SQLERRM;
  END;
END;
$$;