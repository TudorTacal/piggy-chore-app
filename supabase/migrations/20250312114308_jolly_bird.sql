/*
  # Update Default Chores

  1. Changes
    - Update the get_default_chores function with new chore lists
    - Add specific morning and evening chores with £0.10 reward
  
  2. Purpose
    - Provide predefined morning and evening routines
    - Set consistent reward amounts
*/

-- Update the get_default_chores function with new chore lists
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
      ('Brush teeth', 'Brush your teeth thoroughly in the morning', 0.10, 'morning', false),
      ('Wash hands', 'Wash your hands with soap', 0.10, 'morning', false),
      ('Wash your face', 'Clean your face properly', 0.10, 'morning', false),
      ('Make the bed', 'Make your bed neatly', 0.10, 'morning', false),
      ('Change into school clothes', 'Get dressed for school', 0.10, 'morning', false),
      ('Leave the house in time', 'Be ready to leave on schedule', 0.10, 'morning', false);
  ELSE
    RETURN QUERY VALUES
      ('Wash hands', 'Wash your hands before dinner', 0.10, 'evening', false),
      ('Eat dinner', 'Eat your dinner properly', 0.10, 'evening', false),
      ('Help with dishes', 'Help clean up after dinner', 0.10, 'evening', false),
      ('Tidy up after dinner', 'Clean your eating area', 0.10, 'evening', false),
      ('Change into pyjamas', 'Get ready for bed', 0.10, 'evening', false),
      ('Tidy up the clothes', 'Put away your clothes neatly', 0.10, 'evening', false),
      ('Tidy up your room', 'Keep your room clean and organized', 0.10, 'evening', false),
      ('Wash your face', 'Clean your face before bed', 0.10, 'evening', false),
      ('Brush teeth', 'Brush your teeth before bed', 0.10, 'evening', false);
  END IF;
END;
$$ LANGUAGE plpgsql;