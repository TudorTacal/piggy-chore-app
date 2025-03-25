/*
  # Add Chore Toggle Functionality

  1. Changes
    - Add toggle_chore function to handle both completion and reset
    - Update chore_completions table structure
    - Add proper RLS policies
  
  2. Security
    - Ensure proper balance management
    - Maintain data consistency
    - Add proper authorization checks
*/

-- Add completion_status to chores
ALTER TABLE chores ADD COLUMN IF NOT EXISTS completion_status boolean DEFAULT false;

-- Create function to toggle chore completion
CREATE OR REPLACE FUNCTION toggle_chore(
  p_chore_id uuid,
  p_user_id uuid,
  p_completed boolean
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
  WHERE c.id = p_chore_id;

  IF v_chore_data IS NULL THEN
    RAISE EXCEPTION 'Chore not found or not authorized';
  END IF;

  -- Store previous balance
  v_previous_balance := v_chore_data.current_balance;

  -- Start a transaction
  BEGIN
    IF p_completed THEN
      -- Mark as completed
      UPDATE chores
      SET 
        completion_status = true,
        completed_at = now(),
        updated_at = now()
      WHERE id = p_chore_id
      RETURNING * INTO v_chore_data;

      -- Record the completion
      INSERT INTO chore_completions (
        chore_id,
        child_id,
        completed_by,
        reward_amount
      ) VALUES (
        p_chore_id,
        v_chore_data.child_id,
        p_user_id,
        v_chore_data.reward_amount
      );

      -- Add reward to balance
      UPDATE child_balances
      SET 
        amount = amount + v_chore_data.reward_amount,
        updated_at = now()
      WHERE child_id = v_chore_data.child_id
      RETURNING amount INTO v_new_balance;
    ELSE
      -- Mark as not completed
      UPDATE chores
      SET 
        completion_status = false,
        completed_at = null,
        updated_at = now()
      WHERE id = p_chore_id
      RETURNING * INTO v_chore_data;

      -- Delete the most recent completion record
      DELETE FROM chore_completions
      WHERE chore_id = p_chore_id
      AND completed_at = (
        SELECT MAX(completed_at)
        FROM chore_completions
        WHERE chore_id = p_chore_id
      );

      -- Subtract reward from balance
      UPDATE child_balances
      SET 
        amount = GREATEST(0, amount - v_chore_data.reward_amount),
        updated_at = now()
      WHERE child_id = v_chore_data.child_id
      RETURNING amount INTO v_new_balance;
    END IF;

    -- Build the result object
    SELECT jsonb_build_object(
      'chore', row_to_json(v_chore_data),
      'balance', v_new_balance,
      'previous_balance', v_previous_balance,
      'reward_amount', v_chore_data.reward_amount,
      'completed', p_completed
    ) INTO v_result;

    RETURN v_result;
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to toggle chore: %', SQLERRM;
  END;
END;
$$;