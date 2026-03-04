"use client";

import { useState, useCallback } from "react";
import { Input } from "@vestrapay/ui/components/input";
import { Label } from "@vestrapay/ui/components/label";
import { Button } from "@vestrapay/ui/components/button";
import { CreditCard } from "@/components/icons";
import { detectCardBrand, CardBrandIcon } from "@/components/card-brands";
import { VirtualCard } from "@/components/virtual-card";
import { PaymentResult } from "@/components/payment-result";
import { ThreeDsChallenge } from "@/components/three-ds-challenge";
import { chargeCard, complete3ds, verifyTransaction } from "@/lib/api";
import { useTransactionPoller } from "@/hooks/use-transaction-poller";
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
}: PaymentComponentProps): React.ReactNode {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  const [phase, setPhase] = useState<CardPaymentPhase>({ step: "form" });

  const brand = detectCardBrand(cardNumber);
  const isComplete =
    cardNumber.replace(/\s/g, "").length >= 15 && expiry.length >= 4 && cvv.length >= 3;

  const threeDsRef = phase.step === "3ds" ? phase.reference : "";
  useTransactionPoller({
    reference: threeDsRef,
    enabled: phase.step === "3ds",
    intervalMs: 3_000,
    onSettled: (status) => {
      setPhase({ step: "result", status, reference: threeDsRef });
    },
  });

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
          break;
        case "3ds_required":
          setPhase({ step: "3ds", html: threeDsHtml ?? "", reference: apiRef });
          break;
        case "failed":
          setPhase({ step: "result", status: "failed", reference: apiRef });
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setPhase({ step: "result", status: "failed", reference, errorMsg: msg });
    }
  }, [cardNumber, expiry, cvv, amount, amountInSmallestUnit, currency, email, reference]);

  const handle3dsComplete = useCallback(async (ref: string) => {
    setPhase({ step: "processing" });

    try {
      const res = await complete3ds({ reference: ref });
      const { status, reference: apiRef } = res.data;

      setPhase({
        step: "result",
        status: status === "success" ? "success" : "failed",
        reference: apiRef,
      });
    } catch {
      try {
        const verify = await verifyTransaction(ref);
        const finalStatus = verify.data.status === "success" ? "success" : "failed";
        setPhase({ step: "result", status: finalStatus, reference: ref });
      } catch (verifyErr) {
        const msg = verifyErr instanceof Error ? verifyErr.message : "3DS verification failed";
        setPhase({ step: "result", status: "failed", reference: ref, errorMsg: msg });
      }
    }
  }, []);

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
      <ThreeDsChallenge
        html={phase.html}
        reference={phase.reference}
        onComplete={handle3dsComplete}
      />
    );
  }

  if (phase.step === "result") {
    return (
      <PaymentResult
        status={phase.status}
        amount={amount}
        reference={phase.reference}
        onClose={resetToForm}
        onRetry={handleCharge}
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
        onClick={handleCharge}
      >
        {`Pay ${amount}`}
      </Button>
    </div>
  );
}
