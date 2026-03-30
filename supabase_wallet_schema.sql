-- ════════════════════════════════════════════════════════════════
-- SMART PARKING — WALLET & PAYMENT SCHEMA UPDATE
-- Run this entire script in your Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── 1. Extend bookings table with payment + lifecycle columns ──
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_method  text      DEFAULT 'upi',
  ADD COLUMN IF NOT EXISTS amount_paid     numeric   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_end    timestamp with time zone,
  ADD COLUMN IF NOT EXISTS start_time      timestamp with time zone,
  ADD COLUMN IF NOT EXISTS actual_end      timestamp with time zone,
  ADD COLUMN IF NOT EXISTS overtime_charge numeric   DEFAULT 0;

-- ── 2. Wallets table (one row per user) ──────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid    REFERENCES auth.users NOT NULL UNIQUE,
  balance    numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 3. Transactions table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type        text NOT NULL CHECK (type IN ('credit', 'debit', 'refund')),
  amount      numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ── 4. Update new-user trigger to also create a wallet row ────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, vehicle_number, phone_number)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'vehicle_number',
    new.raw_user_meta_data->>'phone_number'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (new.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Back-fill wallets for existing users ───────────────────
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;
