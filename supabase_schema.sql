-- 1. Create the Profiles table to store user details (Name, Vehicle)
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text not null,
  vehicle_number text not null,
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

-- Policy: Users can insert their own profile
create policy "Users can insert their own profile" 
on profiles for insert 
with check ( auth.uid() = id );

-- Policy: Users can view their own profile
create policy "Users can view own profile" 
on profiles for select 
using ( auth.uid() = id );

-- Policy: Users can update their own profile
create policy "Users can update own profile" 
on profiles for update 
using ( auth.uid() = id );

-------------------------------------------------------------------------

-- 2. Create the Bookings table
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  slot_id text not null,
  level integer not null,
  time_range text not null,
  times jsonb not null,
  duration integer not null,
  total_amount numeric not null,
  status text not null default 'reserved', -- 'reserved', 'confirmed', 'completed', 'cancelled'
  vehicle_number text not null,
  booking_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security (RLS) for bookings
alter table public.bookings enable row level security;

-- Policy: Users can insert their own bookings
create policy "Users can insert own bookings" 
on bookings for insert 
with check ( auth.uid() = user_id );

-- Policy: Users can view their own bookings
create policy "Users can view own bookings" 
on bookings for select 
using ( auth.uid() = user_id );

-- Policy: Users can update their own bookings (e.g., cancel)
create policy "Users can update own bookings" 
on bookings for update 
using ( auth.uid() = user_id );

-- Policy: ANYONE can view ALL bookings (to see which slots are unavailable on the public dashboard map)
create policy "Anyone can view bookings" 
on bookings for select 
using ( true );

-------------------------------------------------------------------------

-- 3. Automatic Profile Creation Trigger
-- This creates a profile row automatically whenever a new auth.user is created via Supabase.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, vehicle_number, phone_number)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'vehicle_number', new.raw_user_meta_data->>'phone_number');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Revoke execute permissions for security
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Exclude tables from GraphQL schema
COMMENT ON TABLE public.profiles IS '@graphql({"exclude": true})';
COMMENT ON TABLE public.bookings IS '@graphql({"exclude": true})';
