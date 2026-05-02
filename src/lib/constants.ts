/**
 * Canonical list of supported Pakistan cities.
 * This is the SINGLE source of truth — import this everywhere.
 */
export const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad',
] as const;

export type PakistanCity = (typeof PAKISTAN_CITIES)[number];

/**
 * City coordinates in [lng, lat] order (MapLibre convention).
 */
export const CITY_COORDS: Record<PakistanCity, [number, number]> = {
  Karachi:    [67.0011, 24.8607],
  Lahore:     [74.3587, 31.5204],
  Islamabad:  [73.0479, 33.6844],
  Faisalabad: [73.1350, 31.4504],
  Multan:     [71.5249, 30.1575],
  Peshawar:   [71.5249, 34.0151],
  Quetta:     [66.9750, 30.1798],
  Hyderabad:  [68.3578, 25.3960],
};
