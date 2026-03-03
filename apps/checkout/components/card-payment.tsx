"use client";

import { useState } from "react";
import { Input } from "@vestrapay/ui/components/input";
import { Label } from "@vestrapay/ui/components/label";
import { Button } from "@vestrapay/ui/components/button";
import { CreditCard } from "@/components/icons";
import { detectCardBrand, CardBrandIcon } from "@/components/card-brands";
import { VirtualCard } from "@/components/virtual-card";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentSimulation } from "@/hooks/use-payment-simulation";
import { formatCardNumber, formatExpiry } from "@/lib/formatters";
import type { PaymentComponentProps } from "@/lib/types";

export function CardPayment({ amount, reference }: PaymentComponentProps): React.ReactNode {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  const { status, simulate, reset } = usePaymentSimulation({ delay: 3000 });

  const brand = detectCardBrand(cardNumber);
  const isComplete =
    cardNumber.replace(/\s/g, "").length >= 15 && expiry.length >= 4 && cvv.length >= 3;

  if (status !== "idle") {
    return (
      <PaymentResult
        status={status}
        amount={amount}
        reference={reference}
        onClose={reset}
        onRetry={simulate}
      />
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300 sm:space-y-5">
      <VirtualCard
        cardNumber={cardNumber}
        expiry={expiry}
        cvv={cvv}
        cardholderName={cardholderName}
        brand={brand}
        isFlipped={isCvvFocused}
      />
      <div className="space-y-2">
        <Label htmlFor="card-number" className="text-[13px] font-medium text-[#3c4257]">
          Card number
        </Label>
        <div className="relative">
          <Input
            id="card-number"
            type="text"
            inputMode="numeric"
            placeholder="1234  1234  1234  1234"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            className="h-10 rounded-lg border-[#e3e8ee] bg-white pr-14 pl-4 text-sm tracking-wider text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
          />
          <div className="absolute top-1/2 right-3 -translate-y-1/2 transition-all duration-300">
            {brand !== "unknown" ? (
              <div className="animate-in fade-in-0 zoom-in-75 duration-300">
                <CardBrandIcon brand={brand} className="h-6 w-10" />
              </div>
            ) : (
              <CreditCard className="size-5 text-[#cdd3da]" />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardholder-name" className="text-[13px] font-medium text-[#3c4257]">
          Cardholder name
        </Label>
        <Input
          id="cardholder-name"
          type="text"
          placeholder="Name on card"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="h-10 rounded-lg border-[#e3e8ee] bg-white pl-4 text-sm text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry" className="text-[13px] font-medium text-[#3c4257]">
            Expiry
          </Label>
          <Input
            id="expiry"
            type="text"
            inputMode="numeric"
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            className="h-10 rounded-lg border-[#e3e8ee] bg-white text-sm tracking-wider text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvv" className="text-[13px] font-medium text-[#3c4257]">
            CVC
          </Label>
          <Input
            id="cvv"
            type="password"
            inputMode="numeric"
            placeholder="CVC"
            maxLength={4}
            value={cvv}
            onFocus={() => setIsCvvFocused(true)}
            onBlur={() => setIsCvvFocused(false)}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="h-10 rounded-lg border-[#e3e8ee] bg-white text-sm tracking-wider text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
          />
        </div>
      </div>

      <label className="mt-1 flex cursor-pointer items-center gap-2.5 select-none">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="size-4 cursor-pointer rounded border-[#e3e8ee] accent-[#34287b]"
        />
        <span className="text-[13px] text-[#6b7c93]">Save card for future payments</span>
      </label>

      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 sm:mt-2 sm:h-11 sm:text-[15px]"
        size="lg"
        disabled={!isComplete}
        onClick={simulate}
      >
        {`Pay ${amount}`}
      </Button>
    </div>
  );
}
