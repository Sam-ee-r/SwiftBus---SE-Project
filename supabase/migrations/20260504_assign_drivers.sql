DO $$
DECLARE
  d RECORD;
  b UUID;
BEGIN
  FOR d IN SELECT id FROM public.drivers WHERE bus_id IS NULL LOOP
    SELECT id INTO b FROM public.buses ORDER BY random() LIMIT 1;
    UPDATE public.drivers SET bus_id = b WHERE id = d.id;
  END LOOP;
END $$;
