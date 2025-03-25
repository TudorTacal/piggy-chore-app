/*
  # Add Balance Function

  1. New Function
    - `add_balance`: Safely adds amount to user's balance
      - Parameters:
        - user_id (uuid)
        - amount (decimal)
      - Returns: void
      - Handles concurrent updates safely
*/

create or replace function add_balance(user_id uuid, amount decimal)
returns void
language plpgsql
security definer
as $$
begin
  update users
  set balance = balance + amount
  where id = user_id;
end;
$$;