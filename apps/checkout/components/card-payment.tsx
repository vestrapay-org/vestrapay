"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@vestrapay/ui/components/input";
import { Label } from "@vestrapay/ui/components/label";
import { Button } from "@vestrapay/ui/components/button";
import { CreditCard } from "@/components/icons";
import { detectCardBrand, CardBrandIcon } from "@/components/card-brands";
import { PaymentResult } from "@/components/payment-result";
import { ThreeDsChallenge } from "@/components/three-ds-challenge";
import { chargeCard } from "@/lib/api";
import { formatCardNumber, formatExpiry } from "@/lib/formatters";
import type { PaymentComponentProps, ActivePaymentStatus } from "@/lib/types";

type CardPaymentPhase =
  | { step: "form" }
  | { step: "processing" }
  | { step: "3ds"; html: string; reference: string }
  | { step: "result"; status: ActivePaymentStatus; reference: string; errorMsg?: string };

export function CardPayment({
  amount,
  amountInSmallestUnit,
  reference,
  email,
  currency,
  onPaymentSuccess,
  onPaymentFailed,
}: PaymentComponentProps): React.ReactNode {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  // const [saveCard, setSaveCard] = useState(false);
  const [phase, setPhase] = useState<CardPaymentPhase>({ step: "form" });

  const expiryRef = useRef<HTMLInputElement>(null);
  const cvvRef = useRef<HTMLInputElement>(null);

  const brand = detectCardBrand(cardNumber);
  const isComplete =
    cardNumber.replace(/\s/g, "").length >= 15 && expiry.length >= 4 && cvv.length >= 3;

  const handleCharge = useCallback(async () => {
    setPhase({ step: "processing" });

    try {
      const digits = cardNumber.replace(/\s/g, "");
      const expiryDigits = expiry.replace(/\D/g, "");
      const expiryMonth = expiryDigits.slice(0, 2);
      const expiryYear = expiryDigits.slice(2, 4);

      const res = await chargeCard({
        amount: amountInSmallestUnit,
        currency,
        email,
        description: `Payment ${reference}`,
        card: {
          number: digits,
          cvv,
          expiryMonth,
          expiryYear,
        },
      });

      const { status, reference: apiRef, threeDsHtml } = res.data;

      switch (status) {
        case "success":
          setPhase({ step: "result", status: "success", reference: apiRef });
          onPaymentSuccess?.(apiRef);
          break;
        case "3ds_required":
          setPhase({ step: "3ds", html: threeDsHtml ?? "", reference: apiRef });
          break;
        case "failed":
          setPhase({ step: "result", status: "failed", reference: apiRef });
          onPaymentFailed?.(apiRef);
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setPhase({ step: "result", status: "failed", reference, errorMsg: msg });
      onPaymentFailed?.(reference, msg);
    }
  }, [
    cardNumber,
    expiry,
    cvv,
    amount,
    amountInSmallestUnit,
    currency,
    email,
    reference,
    onPaymentSuccess,
    onPaymentFailed,
  ]);

  const handle3dsSuccess = useCallback(() => {
    const ref = phase.step === "3ds" ? phase.reference : reference;
    setPhase({ step: "result", status: "success", reference: ref });
    onPaymentSuccess?.(ref);
  }, [phase, reference, onPaymentSuccess]);

  const handle3dsFailed = useCallback(
    (errorMsg?: string) => {
      const ref = phase.step === "3ds" ? phase.reference : reference;
      setPhase({ step: "result", status: "failed", reference: ref, errorMsg });
      onPaymentFailed?.(ref, errorMsg);
    },
    [phase, reference, onPaymentFailed],
  );

  const resetToForm = useCallback(() => {
    setPhase({ step: "form" });
  }, []);

  if (phase.step === "processing") {
    return (
      <PaymentResult
        status="processing"
        amount={amount}
        reference={reference}
        onClose={resetToForm}
      />
    );
  }

  if (phase.step === "3ds") {
    return (
      <ThreeDsChallenge html={phase.html} onSuccess={handle3dsSuccess} onFailed={handle3dsFailed} />
    );
  }

  if (phase.step === "result") {
    return (
      <PaymentResult
        status={phase.status}
        amount={amount}
        reference={phase.reference}
        errorMsg={phase.errorMsg}
        onClose={resetToForm}
        onRetry={handleCharge}
      />
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300 sm:space-y-5">
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
            onChange={(e) => {
              const formatted = formatCardNumber(e.target.value);
              setCardNumber(formatted);
              // 19 = 16 digits + 3 spaces for standard cards, 18 = 15 digits + 3 spaces for Amex
              if (
                formatted.replace(/\s/g, "").length >= 16 ||
                (formatted.replace(/\s/g, "").length >= 15 &&
                  detectCardBrand(formatted) === "unknown")
              ) {
                expiryRef.current?.focus();
              }
            }}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry" className="text-[13px] font-medium text-[#3c4257]">
            Expiry
          </Label>
          <Input
            id="expiry"
            ref={expiryRef}
            type="text"
            inputMode="numeric"
            placeholder="MM / YY"
            value={expiry}
            onChange={(e) => {
              const formatted = formatExpiry(e.target.value);
              setExpiry(formatted);
              // "MM/YY" = 5 chars when fully entered
              if (formatted.length >= 5) {
                cvvRef.current?.focus();
              }
            }}
            className="h-10 rounded-lg border-[#e3e8ee] bg-white text-sm tracking-wider text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvv" className="text-[13px] font-medium text-[#3c4257]">
            CVC
          </Label>
          <Input
            id="cvv"
            ref={cvvRef}
            type="password"
            inputMode="numeric"
            placeholder="CVC"
            maxLength={4}
            value={cvv}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
              setCvv(val);
              // Auto-blur when CVV is complete (3 or 4 digits)
              if (val.length >= 3) {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-10 rounded-lg border-[#e3e8ee] bg-white text-sm tracking-wider text-[#3c4257] transition-all duration-200 placeholder:text-[#a3acb9] sm:h-11 sm:text-[15px]"
          />
        </div>
      </div>

      {/* <label className="mt-1 flex cursor-pointer items-center gap-2.5 select-none">
        <input
          type="checkbox"
          checked={saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          className="size-4 cursor-pointer rounded border-[#e3e8ee] accent-[#34287b]"
        />
        <span className="text-[13px] text-[#6b7c93]">Save card for future payments</span>
      </label> */}

      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 sm:mt-2 sm:h-11 sm:text-[15px]"
        size="lg"
        disabled={!isComplete}
        onClick={handleCharge}
      >
        {`Pay ${amount}`}
      </Button>
    </div>
  );
}
