/*
  # Add Chore Completion Tracking

  1. New Tables
    - `chore_completions`
      - Tracks each time a chore is completed
      - Stores completion history with timestamps
      - Links to chores and children

  2. Changes
    - Modify complete_chore function to:
      - Record completion in chore_completions
      - Reset chore status to pending
      - Update balance
*/

-- Create chore_completions table
CREATE TABLE IF NOT EXISTS chore_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id uuid REFERENCES chores(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz DEFAULT now(),
  reward_amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on chore_completions
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;

-- Add policies for chore_completions
CREATE POLICY "Parents can view their children's completions"
  ON chore_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = chore_completions.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create completions"
  ON chore_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = chore_completions.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

-- Update complete_chore function to use completions
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
  WHERE c.id = p_chore_id;

  IF v_chore_data IS NULL THEN
    RAISE EXCEPTION 'Chore not found or not authorized';
  END IF;

  -- Store previous balance
  v_previous_balance := v_chore_data.current_balance;

  -- Start a transaction
  BEGIN
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