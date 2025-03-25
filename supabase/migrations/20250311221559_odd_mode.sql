/*
  # Update Children RLS Policies

  1. Changes
    - Drop existing restrictive policies
    - Add new policies that allow:
      - Parents to create children
      - Parents to view and update their linked children
      - Proper parent-child relationship management

  2. Security
    - Maintain RLS protection while allowing proper access
    - Ensure parents can only access their linked children
    - Allow initial child creation before relationship is established
*/

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Parents can create children" ON children;
  DROP POLICY IF EXISTS "Parents can view their children" ON children;
  DROP POLICY IF EXISTS "Parents can update their children" ON children;
END $$;

-- Create new policies with proper permissions
CREATE POLICY "Enable insert for authenticated users"
  ON children
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable select for users with relationships"
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

CREATE POLICY "Enable update for users with relationships"
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

CREATE POLICY "Enable delete for users with relationships"
  ON children
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_child_relationships.child_id = children.id
      AND parent_child_relationships.parent_id = auth.uid()
    )
  );