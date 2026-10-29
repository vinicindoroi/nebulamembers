import { COUNTRIES_CATALOG } from "./countries";

// Exchange rates relative to 1 USD (October 2026 standard realistic rates)
export const USD_RATES: Record<string, number> = {
  USD: 1.0,
  BRL: 5.7,     // 1 USD = 5.70 BRL (so 97 BRL = ~17.02 USD)
  EUR: 0.92,    // 1 USD = 0.92 EUR
  GBP: 0.78,    // 1 USD = 0.78 GBP
  CAD: 1.38,
  AUD: 1.52,
  MXN: 20.0,    // 1 USD = 20.0 MXN
  ARS: 1050.0,  // 1 USD = 1050 ARS
  COP: 4200.0,  // 1 USD = 4200 COP
  CLP: 950.0,   // 1 USD = 950 CLP
  PEN: 3.75,    // 1 USD = 3.75 PEN
  UYU: 41.5,
  PYG: 7750.0,
  BOB: 6.9,
  CRC: 515.0,
  DOP: 60.0,
  GTQ: 7.75,
  HNL: 24.8,
  CHF: 0.88,
  SEK: 10.6,
  NOK: 10.8,
  DKK: 6.85,
  PLN: 4.0,
  RON: 4.58,
  CZK: 23.2,
  HUF: 370.0,
  JPY: 152.0,
  KRW: 1380.0,
  INR: 84.0,
  IDR: 15600.0,
  PHP: 58.0,
  THB: 33.5,
  MYR: 4.35,
  SGD: 1.32,
  NZD: 1.66,
  ZAR: 17.5,
  TRY: 34.2,
  AED: 3.67,
  SAR: 3.75,
  ILS: 3.72,
};

// Zero-decimal currencies (currencies where prices are typically integers without cents)
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "CLP",
  "COP",
  "PYG",
  "IDR",
  "HUF",
  "ARS",
]);

/**
 * Returns default official currency for an ISO country code
 */
export function getCountryCurrency(countryCode: string): string {
  const match = COUNTRIES_CATALOG.find((c) => c.code === countryCode.toUpperCase());
  return match?.defaultCurrency || "USD";
}

/**
 * Converts an amount from one currency to another using realistic exchange rates.
 * Formats according to local standard (integers for CLP/COP/ARS/JPY, 2 decimals for USD/EUR/BRL/PEN).
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): { value: number; currency: string } {
  const cleanFrom = fromCurrency.toUpperCase();
  const cleanTo = toCurrency.toUpperCase();

  if (cleanFrom === cleanTo) {
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(cleanTo);
    return {
      value: isZeroDecimal ? Math.round(amount) : Math.round(amount * 100) / 100,
      currency: cleanTo,
    };
  }

  const fromRate = USD_RATES[cleanFrom] || 1.0;
  const toRate = USD_RATES[cleanTo] || 1.0;

  // Convert to USD first, then to target currency
  // Example: 97 BRL -> (97 / 5.7) USD -> (97 / 5.7) * 1.0 = 17.02 USD
  // Example: 97 BRL -> (97 / 5.7) * 4200 COP = 71474 COP
  const amountInUsd = amount / fromRate;
  const rawTargetValue = amountInUsd * toRate;

  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(cleanTo);
  const finalValue = isZeroDecimal
    ? Math.round(rawTargetValue)
    : Math.round(rawTargetValue * 100) / 100;

  return {
    value: finalValue,
    currency: cleanTo,
  };
}
