DO $$
DECLARE
  uid UUID;
  bid UUID;
BEGIN
  -- Get user ID for Minaal
  SELECT id INTO uid FROM auth.users WHERE email = 'k240820@nu.edu.pk' LIMIT 1;
  -- Get bus ID
  SELECT id INTO bid FROM public.buses WHERE bus_no = 'BUS-KarIsl-397' LIMIT 1;
  
  IF uid IS NOT NULL AND bid IS NOT NULL THEN
    -- Update the specific driver record for this user
    UPDATE public.drivers SET bus_id = bid WHERE user_id = uid;
  END IF;
END $$;
