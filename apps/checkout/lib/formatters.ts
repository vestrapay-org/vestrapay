export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function toSmallestCurrencyUnit(amount: number, currency: string): number {
  // All known supported currencies are 2-decimal (e.g. NGN, USD, EUR).
  // The API expects smallest currency units (kobo for NGN, cents for USD).
  if (Number.isNaN(amount) || amount < 0) {
    return 0;
  }

  switch (currency) {
    case "NGN":
    case "USD":
    case "EUR":
      return Math.round(amount * 100);
    default:
      return Math.round(amount * 100);
  }
}
