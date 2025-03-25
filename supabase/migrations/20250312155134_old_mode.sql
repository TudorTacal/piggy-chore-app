/*
  # Fix Chore Completion Function

  1. Changes
    - Improve complete_chore function to properly handle balance updates
    - Return both chore and updated balance information
    - Add proper transaction handling
    - Add better error handling

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
  SELECT 
    c.*,
    ch.id as child_id,
    cb.amount as current_balance
  INTO v_chore_data
  FROM chores c
  JOIN children ch ON c.child_id = ch.id
  JOIN parent_child_relationships pcr ON ch.id = pcr.child_id
  LEFT JOIN child_balances cb ON ch.id = cb.child_id
  WHERE c.id = p_chore_id
    AND pcr.parent_id = p_user_id
    AND c.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chore not found or not authorized';
  END IF;

  -- Start a transaction
  BEGIN
    -- Update chore status
    UPDATE chores
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = p_chore_id;

    -- Update child balance
    UPDATE child_balances
    SET 
      amount = amount + v_chore_data.reward_amount,
      updated_at = now()
    WHERE child_id = v_chore_data.child_id
    RETURNING amount INTO v_new_balance;

    -- Get the complete updated data
    WITH updated_data AS (
      SELECT 
        c.*,
        cb.amount as updated_balance
      FROM chores c
      JOIN child_balances cb ON c.child_id = cb.child_id
      WHERE c.id = p_chore_id
    )
    SELECT 
      jsonb_build_object(
        'chore', row_to_json(c.*),
        'balance', v_new_balance,
        'previous_balance', v_chore_data.current_balance,
        'reward_amount', v_chore_data.reward_amount
      ) INTO v_result
    FROM updated_data c;

    RETURN v_result;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to complete chore: %', SQLERRM;
  END;
END;
$$;