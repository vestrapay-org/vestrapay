import type { Bank, Merchant, USSDBank } from "@/lib/types";

export const BANKS: readonly Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access (Diamond) Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

export const USSD_BANKS: readonly USSDBank[] = [
  { code: "044", name: "Access Bank", ussd: "*901#" },
  { code: "058", name: "GTBank", ussd: "*737#" },
  { code: "011", name: "First Bank", ussd: "*894#" },
  { code: "033", name: "UBA", ussd: "*919#" },
  { code: "057", name: "Zenith Bank", ussd: "*966#" },
  { code: "032", name: "Union Bank", ussd: "*826#" },
  { code: "070", name: "Fidelity Bank", ussd: "*770#" },
  { code: "232", name: "Sterling Bank", ussd: "*822#" },
  { code: "215", name: "Unity Bank", ussd: "*7799#" },
  { code: "050", name: "Ecobank", ussd: "*326#" },
];

export const MERCHANT = {
  name: "Demo Store",
  email: "customer@example.com",
  amount: 25000,
  currency: "NGN",
  reference: "VP-TXN-2024-8A3F7B",
} as const satisfies Merchant;
