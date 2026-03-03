"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@vestrapay/ui/components/button";
import { Copy, Check, Clock, Loader2 } from "@/components/icons";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentSimulation } from "@/hooks/use-payment-simulation";
import { useClipboard } from "@/hooks/use-clipboard";
import type { PaymentComponentProps } from "@/lib/types";

const TRANSFER_DETAILS = {
  bank: "Vestrapay MFB",
  accountNumber: "8012345678",
  accountName: "VP/Checkout-Demo",
} as const;

const EXPIRY_SECONDS = 1800;

export function TransferPayment({ amount, reference }: PaymentComponentProps): React.ReactNode {
  const [showDetails, setShowDetails] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(EXPIRY_SECONDS);
  const { status, simulate, reset } = usePaymentSimulation({
    delay: 4000,
    successRate: 0.85,
  });
  const { copied, copy } = useClipboard();
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showDetails || status !== "idle") return;
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showDetails, status]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  function handleGenerate(): void {
    setGenerating(true);
    generateTimeoutRef.current = setTimeout(() => {
      setGenerating(false);
      setShowDetails(true);
    }, 1500);
  }

  if (status !== "idle") {
    return (
      <PaymentResult
        status={status}
        amount={amount}
        reference={reference}
        onClose={() => {
          reset();
          setShowDetails(false);
        }}
        onRetry={simulate}
      />
    );
  }

  if (!showDetails) {
    return (
      <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 duration-300">
        <p className="text-sm leading-relaxed text-[#6b7c93]">
          Generate a temporary bank account. Transfer exactly{" "}
          <span className="font-semibold text-[#3c4257]">{amount}</span> to complete your payment.
        </p>

        <div className="rounded-lg border border-[#e3e8ee] bg-[#f6f9fc] p-4">
          <div className="flex items-center gap-2 text-sm text-[#6b7c93]">
            <Clock className="size-4" />
            <span>
              Account expires in <span className="font-medium text-[#3c4257]">30 minutes</span>
            </span>
          </div>
        </div>

        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 sm:h-11 sm:text-[15px]"
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Account Number"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 space-y-5 duration-400">
      <p className="text-sm leading-relaxed text-[#6b7c93]">
        Transfer exactly <span className="font-semibold text-[#3c4257]">{amount}</span> to the
        account below.
      </p>

      <div className="overflow-hidden rounded-lg border border-[#e3e8ee]">
        <div className="flex items-center justify-between border-b border-[#e3e8ee] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">Bank</p>
            <p className="mt-0.5 text-sm font-medium text-[#3c4257]">{TRANSFER_DETAILS.bank}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#e3e8ee] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">
              Account Number
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-wider text-[#3c4257]">
              {TRANSFER_DETAILS.accountNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(TRANSFER_DETAILS.accountNumber)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#f6f9fc] px-3 py-1.5 text-xs font-medium text-[#6b7c93] transition-all duration-200 hover:bg-[#edf2f7]"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[#e3e8ee] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">
              Account Name
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#3c4257]">
              {TRANSFER_DETAILS.accountName}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">
              Amount
            </p>
            <p className="text-primary mt-0.5 text-sm font-semibold">{amount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-3.5">
        <div className="flex items-start gap-2.5 text-xs leading-relaxed text-amber-800/80">
          <Clock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            This account expires in <span className="font-mono font-semibold">{timeStr}</span>.
            Complete the transfer before it expires.
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-2 h-10 w-full cursor-pointer rounded-lg border-[#e3e8ee] text-sm font-medium tracking-wide text-[#3c4257] transition-all duration-200 hover:bg-[#f6f9fc] sm:h-11 sm:text-[15px]"
        size="lg"
        onClick={simulate}
      >
        I&apos;ve sent the money
      </Button>
    </div>
  );
}
