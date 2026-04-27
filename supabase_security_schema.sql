-- Create parking_logs table for the Security Portal
CREATE TABLE IF NOT EXISTS public.parking_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_number TEXT NOT NULL,
    entry_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    exit_time TIMESTAMPTZ,
    slot_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.parking_logs ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies on this table to prevent conflicts
DROP POLICY IF EXISTS "Allow authenticated read parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Allow authenticated insert parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Allow authenticated update parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Allow public read parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Allow public insert parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Allow public update parking_logs" ON public.parking_logs;
DROP POLICY IF EXISTS "Enable all access for parking_logs" ON public.parking_logs;

-- Create an absolute bulletproof blanket policy for testing/development
CREATE POLICY "Enable all access for parking_logs"
    ON public.parking_logs
    AS PERMISSIVE
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


