/**
 * ISO 3166-1 alpha-2 country codes -> English names.
 * Supplies the full country name CJ's createOrderV2 requires alongside the
 * 2-letter shippingCountryCode.
 */
export const COUNTRIES: Record<string, string> = {
  UA: "Ukraine",
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
  CH: "Switzerland",
  PL: "Poland",
  CZ: "Czech Republic",
  SK: "Slovakia",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  GR: "Greece",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  IE: "Ireland",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  SI: "Slovenia",
  HR: "Croatia",
  AU: "Australia",
  NZ: "New Zealand",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  IL: "Israel",
  TR: "Turkey",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  CL: "Chile",
  ZA: "South Africa",
  IN: "India",
  CN: "China",
};

/** Full English country name for a given ISO alpha-2 code, falling back to the code itself. */
export function getCountryName(code: string): string {
  return COUNTRIES[code.toUpperCase()] ?? code;
}
