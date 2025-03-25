/*
  # Fix Children Table Policies

  1. Changes
    - Safely recreate policies for the children table
    - Add proper parent relationship checks
  
  2. Security
    - Enable RLS
    - Add policies for create, read, update operations
    - Ensure data can only be accessed by related parents

  Note: Using DO blocks to safely handle policy creation
*/

DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Parents can create children" ON children;
    DROP POLICY IF EXISTS "Parents can view their children" ON children;
    DROP POLICY IF EXISTS "Parents can update their children" ON children;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON children;
    DROP POLICY IF EXISTS "Enable select for users based on parent relationship" ON children;
    DROP POLICY IF EXISTS "Enable update for users based on parent relationship" ON children;
    
    -- Create new policies only if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'children' 
        AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON children
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'children' 
        AND policyname = 'Enable select for users based on parent relationship'
    ) THEN
        CREATE POLICY "Enable select for users based on parent relationship" ON children
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM parent_child_relationships
                    WHERE parent_child_relationships.child_id = children.id
                    AND parent_child_relationships.parent_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'children' 
        AND policyname = 'Enable update for users based on parent relationship'
    ) THEN
        CREATE POLICY "Enable update for users based on parent relationship" ON children
            FOR UPDATE TO authenticated
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
    END IF;
END
$$;