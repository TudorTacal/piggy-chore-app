/*
  # Initialize Chores for Existing Children

  1. Purpose
    - Add default chores for any existing children in the database
    - Ensure all children have both morning and evening routines
  
  2. Changes
    - Create a function to initialize chores for all existing children
    - Execute the function to populate chores
*/

-- Function to initialize chores for all existing children
CREATE OR REPLACE FUNCTION initialize_chores_for_existing_children()
RETURNS void AS $$
DECLARE
  child_record RECORD;
BEGIN
  FOR child_record IN SELECT id FROM children
  LOOP
    -- Check if child already has chores
    IF NOT EXISTS (
      SELECT 1 FROM chores WHERE child_id = child_record.id
    ) THEN
      -- Initialize default chores for this child
      PERFORM initialize_default_chores(child_record.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the initialization
SELECT initialize_chores_for_existing_children();

-- Drop the function as it's no longer needed
DROP FUNCTION initialize_chores_for_existing_children();