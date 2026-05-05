-- ============================================================
-- Realistic Pakistani intercity bus route distances (road km)
-- Source: approximate road distances via major highways (M-2, N-55, N-5, KKH)
-- Pricing formula: PKR 2.5 / km, rounded to nearest PKR 50
-- NOTE: City codes match renamed pakistan_city enum (e.g. KHI, LHE, ISB)
-- ============================================================

UPDATE public.routes
SET distance_km = CASE
  -- KHI (Karachi) pairs
  WHEN (departure::text = 'KHI' AND destination::text = 'HYD') OR (departure::text = 'HYD' AND destination::text = 'KHI') THEN 163
  WHEN (departure::text = 'KHI' AND destination::text = 'MUX') OR (departure::text = 'MUX' AND destination::text = 'KHI') THEN 812
  WHEN (departure::text = 'KHI' AND destination::text = 'BWP') OR (departure::text = 'BWP' AND destination::text = 'KHI') THEN 940
  WHEN (departure::text = 'KHI' AND destination::text = 'FSD') OR (departure::text = 'FSD' AND destination::text = 'KHI') THEN 1078
  WHEN (departure::text = 'KHI' AND destination::text = 'LHE') OR (departure::text = 'LHE' AND destination::text = 'KHI') THEN 1212
  WHEN (departure::text = 'KHI' AND destination::text = 'ISB') OR (departure::text = 'ISB' AND destination::text = 'KHI') THEN 1413
  WHEN (departure::text = 'KHI' AND destination::text = 'RWP') OR (departure::text = 'RWP' AND destination::text = 'KHI') THEN 1420
  WHEN (departure::text = 'KHI' AND destination::text = 'PEW') OR (departure::text = 'PEW' AND destination::text = 'KHI') THEN 1587
  WHEN (departure::text = 'KHI' AND destination::text = 'UET') OR (departure::text = 'UET' AND destination::text = 'KHI') THEN 695
  WHEN (departure::text = 'KHI' AND destination::text = 'SKT') OR (departure::text = 'SKT' AND destination::text = 'KHI') THEN 1290
  WHEN (departure::text = 'KHI' AND destination::text = 'GWL') OR (departure::text = 'GWL' AND destination::text = 'KHI') THEN 1272
  WHEN (departure::text = 'KHI' AND destination::text = 'SGD') OR (departure::text = 'SGD' AND destination::text = 'KHI') THEN 1150
  -- LHE (Lahore) pairs
  WHEN (departure::text = 'LHE' AND destination::text = 'GWL') OR (departure::text = 'GWL' AND destination::text = 'LHE') THEN 68
  WHEN (departure::text = 'LHE' AND destination::text = 'SKT') OR (departure::text = 'SKT' AND destination::text = 'LHE') THEN 123
  WHEN (departure::text = 'LHE' AND destination::text = 'FSD') OR (departure::text = 'FSD' AND destination::text = 'LHE') THEN 130
  WHEN (departure::text = 'LHE' AND destination::text = 'SGD') OR (departure::text = 'SGD' AND destination::text = 'LHE') THEN 198
  WHEN (departure::text = 'LHE' AND destination::text = 'MUX') OR (departure::text = 'MUX' AND destination::text = 'LHE') THEN 342
  WHEN (departure::text = 'LHE' AND destination::text = 'BWP') OR (departure::text = 'BWP' AND destination::text = 'LHE') THEN 432
  WHEN (departure::text = 'LHE' AND destination::text = 'RWP') OR (departure::text = 'RWP' AND destination::text = 'LHE') THEN 367
  WHEN (departure::text = 'LHE' AND destination::text = 'ISB') OR (departure::text = 'ISB' AND destination::text = 'LHE') THEN 380
  WHEN (departure::text = 'LHE' AND destination::text = 'PEW') OR (departure::text = 'PEW' AND destination::text = 'LHE') THEN 537
  WHEN (departure::text = 'LHE' AND destination::text = 'ABT') OR (departure::text = 'ABT' AND destination::text = 'LHE') THEN 498
  WHEN (departure::text = 'LHE' AND destination::text = 'UET') OR (departure::text = 'UET' AND destination::text = 'LHE') THEN 1002
  WHEN (departure::text = 'LHE' AND destination::text = 'GIL') OR (departure::text = 'GIL' AND destination::text = 'LHE') THEN 956
  WHEN (departure::text = 'LHE' AND destination::text = 'MFG') OR (departure::text = 'MFG' AND destination::text = 'LHE') THEN 500
  -- ISB / RWP pairs
  WHEN (departure::text = 'ISB' AND destination::text = 'RWP') OR (departure::text = 'RWP' AND destination::text = 'ISB') THEN 14
  WHEN (departure::text = 'ISB' AND destination::text = 'PEW') OR (departure::text = 'PEW' AND destination::text = 'ISB') THEN 176
  WHEN (departure::text = 'ISB' AND destination::text = 'ABT') OR (departure::text = 'ABT' AND destination::text = 'ISB') THEN 121
  WHEN (departure::text = 'ISB' AND destination::text = 'MRD') OR (departure::text = 'MRD' AND destination::text = 'ISB') THEN 224
  WHEN (departure::text = 'ISB' AND destination::text = 'SWN') OR (departure::text = 'SWN' AND destination::text = 'ISB') THEN 266
  WHEN (departure::text = 'ISB' AND destination::text = 'GIL') OR (departure::text = 'GIL' AND destination::text = 'ISB') THEN 591
  WHEN (departure::text = 'ISB' AND destination::text = 'MFG') OR (departure::text = 'MFG' AND destination::text = 'ISB') THEN 143
  WHEN (departure::text = 'ISB' AND destination::text = 'MUX') OR (departure::text = 'MUX' AND destination::text = 'ISB') THEN 340
  WHEN (departure::text = 'ISB' AND destination::text = 'UET') OR (departure::text = 'UET' AND destination::text = 'ISB') THEN 1196
  WHEN (departure::text = 'RWP' AND destination::text = 'PEW') OR (departure::text = 'PEW' AND destination::text = 'RWP') THEN 162
  WHEN (departure::text = 'RWP' AND destination::text = 'ABT') OR (departure::text = 'ABT' AND destination::text = 'RWP') THEN 107
  WHEN (departure::text = 'RWP' AND destination::text = 'MUX') OR (departure::text = 'MUX' AND destination::text = 'RWP') THEN 327
  -- MUX / BWP pairs
  WHEN (departure::text = 'MUX' AND destination::text = 'BWP') OR (departure::text = 'BWP' AND destination::text = 'MUX') THEN 90
  WHEN (departure::text = 'MUX' AND destination::text = 'FSD') OR (departure::text = 'FSD' AND destination::text = 'MUX') THEN 214
  WHEN (departure::text = 'MUX' AND destination::text = 'SGD') OR (departure::text = 'SGD' AND destination::text = 'MUX') THEN 196
  WHEN (departure::text = 'MUX' AND destination::text = 'PEW') OR (departure::text = 'PEW' AND destination::text = 'MUX') THEN 516
  WHEN (departure::text = 'MUX' AND destination::text = 'UET') OR (departure::text = 'UET' AND destination::text = 'MUX') THEN 562
  -- PEW (Peshawar) pairs
  WHEN (departure::text = 'PEW' AND destination::text = 'MRD') OR (departure::text = 'MRD' AND destination::text = 'PEW') THEN 62
  WHEN (departure::text = 'PEW' AND destination::text = 'ABT') OR (departure::text = 'ABT' AND destination::text = 'PEW') THEN 156
  WHEN (departure::text = 'PEW' AND destination::text = 'SWN') OR (departure::text = 'SWN' AND destination::text = 'PEW') THEN 160
  WHEN (departure::text = 'PEW' AND destination::text = 'UET') OR (departure::text = 'UET' AND destination::text = 'PEW') THEN 1132
  -- FSD pairs
  WHEN (departure::text = 'FSD' AND destination::text = 'SGD') OR (departure::text = 'SGD' AND destination::text = 'FSD') THEN 45
  WHEN (departure::text = 'FSD' AND destination::text = 'GWL') OR (departure::text = 'GWL' AND destination::text = 'FSD') THEN 92
  WHEN (departure::text = 'FSD' AND destination::text = 'RWP') OR (departure::text = 'RWP' AND destination::text = 'FSD') THEN 270
  -- Northern pairs
  WHEN (departure::text = 'ABT' AND destination::text = 'MRD') OR (departure::text = 'MRD' AND destination::text = 'ABT') THEN 100
  WHEN (departure::text = 'ABT' AND destination::text = 'SWN') OR (departure::text = 'SWN' AND destination::text = 'ABT') THEN 145
  WHEN (departure::text = 'ABT' AND destination::text = 'MFG') OR (departure::text = 'MFG' AND destination::text = 'ABT') THEN 120
  WHEN (departure::text = 'GIL' AND destination::text = 'MFG') OR (departure::text = 'MFG' AND destination::text = 'GIL') THEN 447
  WHEN (departure::text = 'GWL' AND destination::text = 'SKT') OR (departure::text = 'SKT' AND destination::text = 'GWL') THEN 60
  ELSE distance_km
END;

-- Recalculate seat_price: PKR 2.5/km, rounded to nearest 50, minimum PKR 150
UPDATE public.schedules s
SET seat_price = GREATEST(150, ROUND(r.distance_km * 2.5 / 50) * 50)
FROM public.routes r
WHERE s.route_id = r.id
  AND r.distance_km > 0;
