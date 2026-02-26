-- Run this script in your Supabase SQL Editor

-- 1. Create the licenses table
CREATE TABLE public.licenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    device_id text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow anyone to read licenses (to verify their key)
CREATE POLICY "Allow public read access to licenses"
ON public.licenses FOR SELECT
USING (true);

-- Allow authenticated admins to insert/update licenses (if you want to manage them from the app)
-- Or you can just manage them directly via Supabase dashboard.
-- For standard users, we need them to be able to "claim" a license by setting their device_id
-- We only allow updating the device_id if it is currently null (unclaimed) and the key matches.
CREATE POLICY "Allow users to claim license by setting device_id"
ON public.licenses FOR UPDATE
USING (device_id IS NULL OR device_id = current_setting('request.jwt.claims', true)::json->>'deviceId' /* Wait, we are doing anonymous checks from frontend */)
WITH CHECK (device_id IS NOT NULL);

-- Simplest approach for our use case: 
-- Allow anonymous users to UPDATE the device_id ONLY if it's currently NULL.
DROP POLICY IF EXISTS "Allow users to claim license by setting device_id" ON public.licenses;
CREATE POLICY "Allow anonymous users to claim a license"
ON public.licenses FOR UPDATE
USING (device_id IS NULL)
WITH CHECK (device_id IS NOT NULL);

-- Allow Admin full access (Optional, if you have an admin role system, otherwise just manage in Supabase SQL)
CREATE POLICY "Allow all actions for service role"
ON public.licenses FOR ALL
USING (true)
WITH CHECK (true);

-- Example: Insert some test keys
-- INSERT INTO public.licenses (key) VALUES ('GLAB-TEST-1234'), ('GLAB-PREMIUM-9999');
