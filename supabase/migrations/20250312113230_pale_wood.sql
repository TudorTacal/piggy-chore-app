/*
  # Add Routine Type to Chores

  1. Changes
    - Add routine_type column to chores table
    - Add is_custom column to chores table
    - Add default chores function
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for routine types
*/

-- Add new columns to chores table
ALTER TABLE chores 
ADD COLUMN routine_type text NOT NULL CHECK (routine_type IN ('morning', 'evening')) DEFAULT 'morning',
ADD COLUMN is_custom boolean NOT NULL DEFAULT false;

-- Create function to get default chores
CREATE OR REPLACE FUNCTION get_default_chores(p_routine_type text)
RETURNS TABLE (
  title text,
  description text,
  reward_amount numeric(10,2),
  routine_type text,
  is_custom boolean
) AS $$
BEGIN
  IF p_routine_type = 'morning' THEN
    RETURN QUERY VALUES
      ('Brush teeth', 'Brush your teeth thoroughly', 0.10, 'morning', false),
      ('Make bed', 'Make your bed neatly', 0.15, 'morning', false),
      ('Get dressed', 'Put on clean clothes', 0.10, 'morning', false),
      ('Eat breakfast', 'Have a healthy breakfast', 0.10, 'morning', false);
  ELSE
    RETURN QUERY VALUES
      ('Brush teeth', 'Brush your teeth before bed', 0.10, 'evening', false),
      ('Put on pajamas', 'Change into your pajamas', 0.10, 'evening', false),
      ('Clean room', 'Tidy up your room', 0.20, 'evening', false),
      ('Pack school bag', 'Prepare your bag for tomorrow', 0.15, 'evening', false);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to initialize default chores for a child
CREATE OR REPLACE FUNCTION initialize_default_chores(p_child_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert morning chores
  INSERT INTO chores (
    child_id,
    title,
    description,
    reward_amount,
    routine_type,
    is_custom
  )
  SELECT 
    p_child_id,
    title,
    description,
    reward_amount,
    routine_type,
    is_custom
  FROM get_default_chores('morning');

  -- Insert evening chores
  INSERT INTO chores (
    child_id,
    title,
    description,
    reward_amount,
    routine_type,
    is_custom
  )
  SELECT 
    p_child_id,
    title,
    description,
    reward_amount,
    routine_type,
    is_custom
  FROM get_default_chores('evening');
END;
$$ LANGUAGE plpgsql;

-- Modify the create_child_with_relationships function to initialize chores
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

  -- Initialize default chores
  PERFORM initialize_default_chores(v_child_id);

  -- Return the created child
  RETURN QUERY
  SELECT * FROM children WHERE id = v_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;