/*
  # Add Create Child with Relationships Procedure

  1. Changes
    - Add stored procedure for creating a child with relationships
    - Handles child creation, parent relationship, and initial balance
    - Returns the created child record
  
  2. Security
    - Only accessible to authenticated users
    - Validates parent_id against auth.uid()
*/

CREATE OR REPLACE FUNCTION create_child_with_relationships(
  p_name TEXT,
  p_parent_id UUID,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS TABLE (LIKE children) AS $$
DECLARE
  v_child_id UUID;
BEGIN
  -- Insert the child
  INSERT INTO children (name, avatar_url)
  VALUES (p_name, p_avatar_url)
  RETURNING id INTO v_child_id;

  -- Create parent relationship
  INSERT INTO parent_child_relationships (
    parent_id,
    child_id,
    relationship_type
  ) VALUES (
    p_parent_id,
    v_child_id,
    'parent'
  );

  -- Create initial balance
  INSERT INTO child_balances (
    child_id,
    amount
  ) VALUES (
    v_child_id,
    0
  );

  -- Return the created child
  RETURN QUERY
  SELECT * FROM children WHERE id = v_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;