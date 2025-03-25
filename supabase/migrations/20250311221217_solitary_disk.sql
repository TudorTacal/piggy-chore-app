/*
  # Update RLS policies for children and related tables

  1. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Create and manage their children
      - View and manage child balances
      - Create and manage chores
      - Link with other parents

  2. Changes
    - Enable RLS on all tables
    - Add policies for CRUD operations with existence checks
*/

-- Enable RLS on tables if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'children' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE children ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'parent_child_relationships' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE parent_child_relationships ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'child_balances' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE child_balances ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'chores' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Parents can create children" ON children;
  DROP POLICY IF EXISTS "Parents can view their children" ON children;
  DROP POLICY IF EXISTS "Parents can update their children" ON children;
  DROP POLICY IF EXISTS "Parents can create relationships" ON parent_child_relationships;
  DROP POLICY IF EXISTS "Parents can view their relationships" ON parent_child_relationships;
  DROP POLICY IF EXISTS "Parents can view their children's balances" ON child_balances;
  DROP POLICY IF EXISTS "Parents can update their children's balances" ON child_balances;
  DROP POLICY IF EXISTS "Parents can create child balances" ON child_balances;
  DROP POLICY IF EXISTS "Parents can manage their children's chores" ON chores;
END $$;

-- Create policies for children table
CREATE POLICY "Parents can create children"
  ON children
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Parents can view their children"
  ON children
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = children.id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their children"
  ON children
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = children.id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = children.id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

-- Create policies for parent_child_relationships table
CREATE POLICY "Parents can create relationships"
  ON parent_child_relationships
  FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can view their relationships"
  ON parent_child_relationships
  FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Create policies for child_balances table
CREATE POLICY "Parents can view their children's balances"
  ON child_balances
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = child_balances.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their children's balances"
  ON child_balances
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = child_balances.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create child balances"
  ON child_balances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = child_balances.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );

-- Create policies for chores table
CREATE POLICY "Parents can manage their children's chores"
  ON chores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = chores.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = chores.child_id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );