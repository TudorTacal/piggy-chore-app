/*
  # Create Child Function

  1. New Functions
    - create_child_with_relationships: Creates a child and associated records in a transaction
  
  2. Purpose
    - Ensures atomic creation of child records
    - Handles relationships and balance initialization
    - Maintains data consistency
*/

CREATE OR REPLACE FUNCTION create_child_with_relationships(
  p_name TEXT,
  p_avatar_url TEXT,
  p_parent_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_id UUID;
  v_result jsonb;
BEGIN
  -- Create the child
  INSERT INTO children (name, avatar_url)
  VALUES (p_name, p_avatar_url)
  RETURNING id INTO v_child_id;

  -- Create the parent-child relationship
  INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type)
  VALUES (p_parent_id, v_child_id, 'parent');

  -- Initialize the child's balance
  INSERT INTO child_balances (child_id, amount)
  VALUES (v_child_id, 0);

  -- Get the complete child record
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'avatar_url', c.avatar_url,
    'created_at', c.created_at,
    'updated_at', c.updated_at
  )
  INTO v_result
  FROM children c
  WHERE c.id = v_child_id;

  RETURN v_result;
END;
$$;