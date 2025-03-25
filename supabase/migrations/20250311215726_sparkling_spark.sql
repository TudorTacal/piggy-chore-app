/*
  # Parent-Child Relationship Schema

  1. New Tables
    - `children`
      - `id` (uuid, primary key)
      - `name` (text)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `parent_child_relationships`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references auth.users)
      - `child_id` (uuid, references children)
      - `relationship_type` (text, check constraint)
      - `created_at` (timestamp)
    
    - `child_balances`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children)
      - `amount` (decimal)
      - `updated_at` (timestamp)
    
    - `chores`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children)
      - `title` (text)
      - `description` (text, nullable)
      - `reward_amount` (decimal)
      - `status` (text, check constraint)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated parents to manage their children's data
    - Ensure data isolation between different parent-child relationships
*/

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create parent-child relationships table
CREATE TABLE IF NOT EXISTS parent_child_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent', 'guardian')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

-- Create child balances table
CREATE TABLE IF NOT EXISTS child_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL DEFAULT 0.00,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id)
);

-- Create chores table
CREATE TABLE IF NOT EXISTS chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reward_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- Create policies for children table
CREATE POLICY "Parents can view their children"
  ON children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = children.id
    )
  );

CREATE POLICY "Parents can create children"
  ON children FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Parents can update their children"
  ON children FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = children.id
    )
  );

-- Create policies for parent_child_relationships table
CREATE POLICY "Parents can view their relationships"
  ON parent_child_relationships FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can create relationships"
  ON parent_child_relationships FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

-- Create policies for child_balances table
CREATE POLICY "Parents can view their children's balances"
  ON child_balances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = child_balances.child_id
    )
  );

CREATE POLICY "Parents can update their children's balances"
  ON child_balances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = child_balances.child_id
    )
  );

-- Create policies for chores table
CREATE POLICY "Parents can view their children's chores"
  ON chores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = chores.child_id
    )
  );

CREATE POLICY "Parents can manage their children's chores"
  ON chores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM parent_child_relationships
      WHERE parent_id = auth.uid()
      AND child_id = chores.child_id
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER chores_updated_at
  BEFORE UPDATE ON chores
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to add balance to a child
CREATE OR REPLACE FUNCTION add_child_balance(
  p_child_id uuid,
  p_amount decimal
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO child_balances (child_id, amount)
  VALUES (p_child_id, p_amount)
  ON CONFLICT (child_id)
  DO UPDATE SET
    amount = child_balances.amount + p_amount,
    updated_at = now();
END;
$$;