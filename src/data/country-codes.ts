
export interface CountryCodeInfo {
  code: string; // e.g., "+1"
  name: string; // e.g., "United States"
  iso: string;  // e.g., "US"
}

// A selection of common country codes. This list can be expanded.
export const COUNTRY_CODES: CountryCodeInfo[] = [
  { iso: "AU", name: "Australia", code: "+61" },
  { iso: "AT", name: "Austria", code: "+43" },
  { iso: "BE", name: "Belgium", code: "+32" },
  { iso: "BR", name: "Brazil", code: "+55" },
  { iso: "CN", name: "China", code: "+86" },
  { iso: "DK", name: "Denmark", code: "+45" },
  { iso: "FI", name: "Finland", code: "+358" },
  { iso: "FR", name: "France", code: "+33" },
  { iso: "DE", name: "Germany", code: "+49" },
  { iso: "IN", name: "India", code: "+91" },
  { iso: "IR", name: "Iran", code: "+98" },
  { iso: "IT", name: "Italy", code: "+39" },
  { iso: "JP", name: "Japan", code: "+81" },
  { iso: "NL", name: "Netherlands", code: "+31" },
  { iso: "NO", name: "Norway", code: "+47" },
  { iso: "PL", name: "Poland", code: "+48" },
  { iso: "RU", name: "Russia", code: "+7" },
  { iso: "ZA", name: "South Africa", code: "+27" },
  { iso: "ES", name: "Spain", code: "+34" },
  { iso: "SE", name: "Sweden", code: "+46" },
  { iso: "CH", name: "Switzerland", code: "+41" },
  { iso: "GB", name: "United Kingdom", code: "+44" },
  { iso: "US", name: "United States", code: "+1" },
  // Add more countries as needed
];
