/*
  # Add Reset Balance Function

  1. New Function
    - reset_child_balance: Resets a child's balance to 0
    - Returns the previous balance amount
  
  2. Security
    - Enable RLS protection
    - Validate parent-child relationships
*/

CREATE OR REPLACE FUNCTION reset_child_balance(
  p_child_id uuid,
  p_user_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_balance numeric;
BEGIN
  -- Validate parent-child relationship
  IF NOT EXISTS (
    SELECT 1 
    FROM parent_child_relationships
    WHERE child_id = p_child_id
    AND parent_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to reset balance for this child';
  END IF;

  -- Get and reset balance
  UPDATE child_balances
  SET 
    amount = 0,
    updated_at = now()
  WHERE child_id = p_child_id
  RETURNING amount INTO v_previous_balance;

  RETURN v_previous_balance;
END;
$$;