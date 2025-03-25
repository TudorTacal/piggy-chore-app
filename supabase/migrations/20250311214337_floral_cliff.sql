/*
  # Initial Schema Setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, required)
      - `gender` (text, check constraint for 'boy' or 'girl')
      - `balance` (decimal, default 0.00)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on users table
    - Add policies for authenticated users to:
      - Read their own profile
      - Update their own profile
    - Add trigger for updating updated_at timestamp
*/

-- Create users table
create table public.users (
  id uuid references auth.users(id) primary key,
  name text not null,
  gender text check (gender in ('boy', 'girl')),
  balance decimal default 0.00,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies
create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Trigger for updated_at
create function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row
  execute procedure public.handle_updated_at();