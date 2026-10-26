import { finiteBetween } from "./labsCommon";
export const CURRENCIES = [
  ["CNY", "人民币"],
  ["USD", "美元"],
  ["EUR", "欧元"],
  ["JPY", "日元"],
  ["GBP", "英镑"],
  ["HKD", "港币"],
  ["AUD", "澳元"],
  ["CAD", "加元"],
  ["KRW", "韩元"],
  ["SGD", "新加坡元"],
  ["CHF", "瑞士法郎"],
  ["THB", "泰铢"],
  ["MYR", "林吉特"],
] as const;
export const RATE_SOURCE = "https://frankfurter.dev/";
const codes = new Set<string>(CURRENCIES.map((c) => c[0]));
export const RATE_ENDPOINT = `https://api.frankfurter.dev/v2/rates?base=CNY&quotes=${CURRENCIES.map(
  (c) => c[0],
)
  .filter((c) => c !== "CNY")
  .join(",")}`;
export interface RateSnapshot {
  date: string;
  rates: Record<string, number>;
  dates?: Record<string, string>;
  fetchedAt?: string;
  source?: string;
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value &&
    // Providers publish calendar dates in their local time zones, including UTC+14.
    value <= new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 10)
  );
}
export function validRateSnapshot(value: unknown): value is RateSnapshot {
  const v = value as RateSnapshot;
  return (
    !!v &&
    validDate(v.date) &&
    !!v.rates &&
    typeof v.rates === "object" &&
    !Array.isArray(v.rates) &&
    v.rates.CNY === 1 &&
    Object.keys(v.rates).length > 1 &&
    Object.entries(v.rates).every(
      ([code, rate]) => codes.has(code) && finiteBetween(rate, 1e-12, 1e12),
    ) &&
    (!v.dates ||
      (typeof v.dates === "object" &&
        !Array.isArray(v.dates) &&
        Object.entries(v.dates).every(
          ([code, date]) => codes.has(code) && validDate(date),
        ))) &&
    (!v.fetchedAt || Number.isFinite(Date.parse(v.fetchedAt))) &&
    (!v.source || v.source === RATE_SOURCE)
  );
}
export function parseRateResponse(
  value: unknown,
  now = new Date().toISOString(),
): RateSnapshot {
  if (!Array.isArray(value) || !value.length) throw new Error("汇率数据为空");
  const rates: Record<string, number> = { CNY: 1 },
    dates: Record<string, string> = {};
  for (const row of value) {
    if (
      !row ||
      row.base !== "CNY" ||
      !codes.has(row.quote) ||
      row.quote === "CNY" ||
      rates[row.quote] !== undefined ||
      !finiteBetween(row.rate, 1e-12, 1e12) ||
      !validDate(row.date)
    )
      throw new Error("汇率数据格式异常");
    rates[row.quote] = row.rate;
    dates[row.quote] = row.date;
  }
  return {
    date: Object.values(dates).sort()[0],
    rates,
    dates,
    fetchedAt: now,
    source: RATE_SOURCE,
  };
}
export function pairRate(
  snapshot: RateSnapshot | null,
  from: string,
  to: string,
) {
  if (from === to && codes.has(from)) return 1;
  if (!snapshot?.rates[from] || !snapshot.rates[to]) return null;
  return snapshot.rates[to] / snapshot.rates[from];
}
export function pairDates(
  snapshot: RateSnapshot | null,
  from: string,
  to: string,
) {
  if (!snapshot || from === to) return [];
  return [
    ...new Set(
      [from, to]
        .filter((c) => c !== "CNY")
        .map((c) => snapshot.dates?.[c] || snapshot.date),
    ),
  ].sort();
}
export function calculateConversion(
  amount: string,
  rate: number | null,
  percent: string,
  fixed: string,
) {
  if (!amount.trim() || !percent.trim() || !fixed.trim()) return null;
  const input = Number(amount),
    feePercent = Number(percent),
    feeFixed = Number(fixed);
  if (
    !finiteBetween(input, 0, 1e12) ||
    !finiteBetween(rate, 1e-12, 1e12) ||
    !finiteBetween(feePercent, 0, 100) ||
    !finiteBetween(feeFixed, 0, 1e12)
  )
    return null;
  const fee = (input * feePercent) / 100 + feeFixed;
  if (fee > input) return null;
  return { gross: input * rate, fee, net: (input - fee) * rate };
}
export function formatCurrency(value: number, code: string) {
  return value.toLocaleString("zh-CN", {
    style: "currency",
    currency: code,
    currencyDisplay: "code",
  });
}
export interface CurrencySettings {
  from: string;
  to: string;
  amount: string;
  percent: string;
  fixed: string;
}
export function validCurrencySettings(
  value: unknown,
): value is CurrencySettings {
  const v = value as CurrencySettings;
  return (
    !!v &&
    codes.has(v.from) &&
    codes.has(v.to) &&
    [v.amount, v.percent, v.fixed].every(
      (x) => typeof x === "string" && x.length <= 30,
    )
  );
}
export interface ConversionRecord {
  id: string;
  at: string;
  settings: CurrencySettings;
  rate: number;
  dates: string[];
  fetchedAt: string | null;
  source: string;
  net: number;
  fee: number;
}
export function validConversionRecords(
  value: unknown,
): value is ConversionRecord[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(
      (r) =>
        r &&
        typeof r.id === "string" &&
        Number.isFinite(Date.parse(r.at)) &&
        validCurrencySettings(r.settings) &&
        finiteBetween(r.rate, 1e-12, 1e12) &&
        Array.isArray(r.dates) &&
        r.dates.every(validDate) &&
        (r.fetchedAt === null ||
          (typeof r.fetchedAt === "string" &&
            Number.isFinite(Date.parse(r.fetchedAt)))) &&
        r.source === RATE_SOURCE &&
        finiteBetween(r.net, 0, 1e24) &&
        finiteBetween(r.fee, 0, 1e12),
    )
  );
}
