import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const FROM_CURRENCIES = [
  { value: "COP", label: "COP — Colombian Peso" },
  { value: "MXN", label: "MXN — Mexican Peso" },
  { value: "BRL", label: "BRL — Brazilian Real" },
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
];

export const TO_CURRENCIES = [
  { value: "GBP", label: "GBP — British Pound" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

export function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
    CAD: "CA$",
    AUD: "A$",
  };
  return map[currency] ?? currency + " ";
}

interface CorridorSelectProps {
  fromValue: string;
  toValue: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export function CorridorSelect({ fromValue, toValue, onFromChange, onToChange }: CorridorSelectProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Sending from
        </label>
        <Select value={fromValue} onValueChange={onFromChange}>
          <SelectTrigger
            className="bg-white/5 border-white/10 text-foreground"
            data-testid="select-from-currency"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0F1729] border-white/10">
            {FROM_CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value} data-testid={`option-from-${c.value}`}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[160px]">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Receiving in
        </label>
        <Select value={toValue} onValueChange={onToChange}>
          <SelectTrigger
            className="bg-white/5 border-white/10 text-foreground"
            data-testid="select-to-currency"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0F1729] border-white/10">
            {TO_CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value} data-testid={`option-to-${c.value}`}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
