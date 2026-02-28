export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£", USD: "$", EUR: "€",
  COP: "$", MXN: "$", BRL: "R$", PHP: "₱", INR: "₹", NGN: "₦",
};

export const ALL_CURRENCIES = [
  { value: "COP", symbol: "$", country: "Colombia", currency: "COP", defaultAmount: "5000000" },
  { value: "MXN", symbol: "$", country: "Mexico", currency: "MXN", defaultAmount: "100000" },
  { value: "BRL", symbol: "R$", country: "Brazil", currency: "BRL", defaultAmount: "10000" },
  { value: "PHP", symbol: "₱", country: "Philippines", currency: "PHP", defaultAmount: "100000" },
  { value: "INR", symbol: "₹", country: "India", currency: "INR", defaultAmount: "200000" },
  { value: "NGN", symbol: "₦", country: "Nigeria", currency: "NGN", defaultAmount: "5000000" },
  { value: "GBP", symbol: "£", country: "United Kingdom", currency: "GBP", defaultAmount: "950" },
  { value: "USD", symbol: "$", country: "United States", currency: "USD", defaultAmount: "1200" },
  { value: "EUR", symbol: "€", country: "Europe", currency: "EUR", defaultAmount: "1100" },
];

export const FROM_OPTIONS = ALL_CURRENCIES;
export const TO_OPTIONS = ALL_CURRENCIES;

export const APPROX_RATES: Record<string, Record<string, number>> = {
  COP: { GBP: 1 / 5247, USD: 1 / 4289, EUR: 1 / 4500 },
  MXN: { GBP: 1 / 21.4, USD: 1 / 17.8, EUR: 1 / 19.5 },
  BRL: { GBP: 1 / 6.3, USD: 1 / 5.02, EUR: 1 / 5.51 },
  PHP: { GBP: 1 / 70.8, USD: 1 / 56.2, EUR: 1 / 60.0 },
  INR: { GBP: 1 / 103.8, USD: 1 / 83.2, EUR: 1 / 89.0 },
  NGN: { GBP: 1 / 2010, USD: 1 / 1600, EUR: 1 / 1720 },
  GBP: { USD: 1.27, EUR: 1.17, COP: 5247, MXN: 21.4, BRL: 6.3, PHP: 70.8, INR: 103.8, NGN: 2010 },
  USD: { GBP: 0.79, EUR: 0.92, COP: 4289, MXN: 17.8, BRL: 5.02, PHP: 56.2, INR: 83.2, NGN: 1600 },
  EUR: { GBP: 0.85, USD: 1.09, COP: 4500, MXN: 19.5, BRL: 5.51, PHP: 60.0, INR: 89.0, NGN: 1720 },
};

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
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
