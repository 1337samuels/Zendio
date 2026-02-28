export const FROM_OPTIONS = [
  { value: "COP", flag: "🇨🇴", country: "Colombia", currency: "COP", defaultAmount: "5000000" },
  { value: "MXN", flag: "🇲🇽", country: "Mexico", currency: "MXN", defaultAmount: "100000" },
  { value: "BRL", flag: "🇧🇷", country: "Brazil", currency: "BRL", defaultAmount: "10000" },
  { value: "PHP", flag: "🇵🇭", country: "Philippines", currency: "PHP", defaultAmount: "100000" },
  { value: "INR", flag: "🇮🇳", country: "India", currency: "INR", defaultAmount: "200000" },
  { value: "NGN", flag: "🇳🇬", country: "Nigeria", currency: "NGN", defaultAmount: "5000000" },
];

export const TO_OPTIONS = [
  { value: "GBP", flag: "🇬🇧", country: "United Kingdom", currency: "GBP" },
  { value: "USD", flag: "🇺🇸", country: "United States", currency: "USD" },
  { value: "EUR", flag: "🇪🇺", country: "Europe", currency: "EUR" },
];

export const APPROX_RATES: Record<string, Record<string, number>> = {
  COP: { GBP: 1 / 5247, USD: 1 / 4289, EUR: 1 / 4500 },
  MXN: { GBP: 1 / 21.4, USD: 1 / 17.8, EUR: 1 / 19.5 },
  BRL: { GBP: 1 / 6.3, USD: 1 / 5.02, EUR: 1 / 5.51 },
  PHP: { GBP: 1 / 70.8, USD: 1 / 56.2, EUR: 1 / 60.0 },
  INR: { GBP: 1 / 103.8, USD: 1 / 83.2, EUR: 1 / 89.0 },
  NGN: { GBP: 1 / 2010, USD: 1 / 1600, EUR: 1 / 1720 },
};

export function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
    CAD: "CA$",
    AUD: "A$",
  };
  return map[currency] ?? `${currency} `;
}

export function getApproxConverted(amount: string, from: string, to: string): string | null {
  const num = parseFloat(amount.replace(/,/g, ""));
  if (!num || isNaN(num)) return null;
  const rate = APPROX_RATES[from]?.[to];
  if (!rate) return null;
  const converted = num * rate;
  const sym = getCurrencySymbol(to);
  if (converted >= 1000) return `${sym}${Math.round(converted).toLocaleString()}`;
  if (converted >= 1) return `${sym}${converted.toFixed(2)}`;
  return `${sym}${converted.toFixed(4)}`;
}
