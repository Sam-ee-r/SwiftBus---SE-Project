-- Enable Supabase Realtime for the bookings table
-- This allows clients to listen to inserts, updates, and deletes
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
