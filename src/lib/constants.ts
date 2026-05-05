/**
 * IATA-style 3-letter city codes used in the pakistan_city enum.
 * This is the SINGLE source of truth — import this everywhere.
 */
export const PAKISTAN_CITIES = [
  'KHI', // Karachi
  'LHE', // Lahore
  'ISB', // Islamabad
  'RWP', // Rawalpindi
  'FSD', // Faisalabad
  'MUX', // Multan
  'HYD', // Hyderabad
  'PEW', // Peshawar
  'UET', // Quetta
  'SKT', // Sialkot
  'GWL', // Gujranwala
  'JHG', // Jhang
  'SGD', // Sargodha
  'BWP', // Bahawalpur
  'GIL', // Gilgit
  'KDU', // Skardu
  'ABT', // Abbottabad
  'MRD', // Mardan
  'SWN', // Swat
  'MFG', // Muzaffarabad
] as const;

export type PakistanCity = (typeof PAKISTAN_CITIES)[number];

/**
 * Full display name for each city code.
 */
export const CITY_NAMES: Record<string, string> = {
  KHI: 'Karachi',
  LHE: 'Lahore',
  ISB: 'Islamabad',
  RWP: 'Rawalpindi',
  FSD: 'Faisalabad',
  MUX: 'Multan',
  HYD: 'Hyderabad',
  PEW: 'Peshawar',
  UET: 'Quetta',
  SKT: 'Sialkot',
  GWL: 'Gujranwala',
  JHG: 'Jhang',
  SGD: 'Sargodha',
  BWP: 'Bahawalpur',
  GIL: 'Gilgit',
  KDU: 'Skardu',
  ABT: 'Abbottabad',
  MRD: 'Mardan',
  SWN: 'Swat',
  MFG: 'Muzaffarabad',
};

/**
 * City coordinates in [lng, lat] order (Leaflet/MapLibre: [lat, lng]).
 */
export const CITY_COORDS: Record<string, [number, number]> = {
  KHI: [67.0011, 24.8607],
  LHE: [74.3587, 31.5204],
  ISB: [73.0479, 33.6844],
  RWP: [73.0435, 33.5909],
  FSD: [73.1350, 31.4504],
  MUX: [71.5249, 30.1575],
  HYD: [68.3578, 25.3960],
  PEW: [71.5249, 34.0151],
  UET: [66.9750, 30.1798],
  SKT: [74.5310, 32.4925],
  GWL: [74.1883, 32.1617],
  JHG: [72.3167, 31.2681],
  SGD: [72.6861, 32.0740],
  BWP: [71.6833, 29.3957],
  GIL: [74.3137, 35.9200],
  KDU: [75.6358, 35.2975],
  ABT: [73.2114, 34.1495],
  MRD: [72.0404, 34.1989],
  SWN: [72.4258, 35.2227],
  MFG: [73.4710, 34.3700],
};
