-- ============================================================
-- Rename pakistan_city enum values to IATA-style 3-letter codes
-- Safe version: each rename is wrapped in an existence check
-- so re-running this script will never error on already-renamed values.
-- ============================================================

DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Karachi')      THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Karachi'      TO 'KHI'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Lahore')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Lahore'        TO 'LHE'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Islamabad')     THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Islamabad'     TO 'ISB'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Rawalpindi')    THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Rawalpindi'    TO 'RWP'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Faisalabad')    THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Faisalabad'    TO 'FSD'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Multan')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Multan'        TO 'MUX'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Hyderabad')     THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Hyderabad'     TO 'HYD'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Peshawar')      THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Peshawar'      TO 'PEW'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Quetta')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Quetta'        TO 'UET'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Sialkot')       THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Sialkot'       TO 'SKT'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Gujranwala')    THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Gujranwala'    TO 'GWL'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Jhang')         THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Jhang'         TO 'JHG'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Sargodha')      THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Sargodha'      TO 'SGD'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Bahawalpur')    THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Bahawalpur'    TO 'BWP'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Gilgit')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Gilgit'        TO 'GIL'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Skardu')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Skardu'        TO 'KDU'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Abbottabad')    THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Abbottabad'    TO 'ABT'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Mardan')        THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Mardan'        TO 'MRD'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Swat')          THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Swat'          TO 'SWN'; END IF; END $$;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' AND e.enumlabel = 'Muzaffarabad')  THEN ALTER TYPE public.pakistan_city RENAME VALUE 'Muzaffarabad'  TO 'MFG'; END IF; END $$;

-- Verify: show current enum values after migration
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'pakistan_city' ORDER BY enumsortorder;
