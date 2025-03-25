/*
  # Fix Children RLS Policies

  1. Changes
    - Drop and recreate children table policies to fix permission issues
    - Ensure authenticated users can create children
    - Maintain proper access control for viewing and updating children

  2. Security
    - Enable RLS on children table
    - Allow authenticated users to create children
    - Restrict viewing and updating to parents with relationships
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON children;
DROP POLICY IF EXISTS "Enable select for users with relationships" ON children;
DROP POLICY IF EXISTS "Enable update for users with relationships" ON children;
DROP POLICY IF EXISTS "Enable delete for users with relationships" ON children;
DROP POLICY IF EXISTS "Parents can create children" ON children;
DROP POLICY IF EXISTS "Parents can view their children" ON children;
DROP POLICY IF EXISTS "Parents can update their children" ON children;

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