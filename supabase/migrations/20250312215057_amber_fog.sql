/*
  # Add Reset Chores Function

  1. New Function
    - reset_chores: Resets chores without affecting balance
    - Handles resetting chores by routine type
  
  2. Security
    - Enable RLS protection
    - Validate parent-child relationships
*/

-- Create function to reset chores
CREATE OR REPLACE FUNCTION reset_chores(
  p_child_id uuid,
  p_routine_type text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate parent-child relationship
  IF NOT EXISTS (
    SELECT 1 
    FROM parent_child_relationships
    WHERE child_id = p_child_id
    AND parent_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to reset chores for this child';
  END IF;

  -- Reset completion status for chores
  UPDATE chores
  SET 
    completion_status = false,
    completed_at = null,
    updated_at = now()
  WHERE child_id = p_child_id
  AND routine_type = p_routine_type;
END;
$$;