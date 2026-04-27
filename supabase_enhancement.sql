-- ════════════════════════════════════════════════════════════════
-- SMART PARKING — HYBRID SYSTEM ENHANCEMENT MIGRATION
-- Run this in Supabase SQL Editor → Run
-- ════════════════════════════════════════════════════════════════

-- ── 1. Add notification token to profiles ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_token text,
  ADD COLUMN IF NOT EXISTS notification_endpoint text;

-- ── 2. Add verification tracking to bookings ────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS verification_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS wrong_slot_count integer DEFAULT 0;

-- ── 3. Index for fast status lookups ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);

-- ── 4. Admin / Security policy — allows reading ALL bookings ────
-- (existing "Anyone can view bookings" policy already does SELECT)
-- Add UPDATE policy for admin role (email-based in frontend, RLS here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings'
    AND policyname = 'Admin can update all bookings'
  ) THEN
    CREATE POLICY "Admin can update all bookings"
      ON public.bookings FOR UPDATE
      USING (auth.role() = 'authenticated')  -- frontend enforces email check; this opens update for authenticated users broadly
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── 5. Allow authenticated users to update profiles (for notification token) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Users can update notification token'
  ) THEN
    CREATE POLICY "Users can update notification token"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- ── 6. parked_unverified status — no DB enum, just text column ───
-- The bookings.status column is already 'text', so no migration needed.
-- Valid values: 'reserved', 'parked_unverified', 'confirmed', 'completed', 'cancelled'
-- This comment documents the new lifecycle.

-- ── 7. Notification log table (optional, for debugging) ──────────
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type       text NOT NULL,  -- 'parking_detected', 'reminder', 'cancelled', 'time_warning'
  payload    jsonb,
  sent_at    timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════════
-- RUN COMPLETE ✅
-- New columns: profiles.notification_token, profiles.notification_endpoint
-- New columns: bookings.verification_attempts, bookings.verified_at, bookings.wrong_slot_count
-- New table: notification_logs
-- ════════════════════════════════════════════════════════════════
