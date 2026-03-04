"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX } from "@/components/icons";
import type { ActivePaymentStatus } from "@/lib/types";

interface PaymentResultProps {
  readonly status: ActivePaymentStatus;
  readonly amount: string;
  readonly reference: string;
  readonly errorMsg?: string;
  readonly onClose: () => void;
  readonly onRetry?: (() => void) | undefined;
}

function ProcessingIndicator(): React.ReactNode {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 92));
    }, 50);
    return () => clearInterval(progressInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative flex size-20 items-center justify-center">
        <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="oklch(0.28 0.1 280 / 0.08)"
            strokeWidth="5"
          />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="oklch(0.28 0.1 280)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            className="transition-[stroke-dashoffset] duration-200 ease-out"
          />
        </svg>
        <span className="absolute font-mono text-sm font-semibold text-[#3c4257]">
          {Math.round(progress)}%
        </span>
      </div>
      <p className="mt-5 text-sm text-[#6b7c93]">Processing payment…</p>
    </div>
  );
}

function SuccessResult({
  amount,
  onClose,
}: Readonly<{
  amount: string;
  onClose: () => void;
}>): React.ReactNode {
  return (
    <>
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-50">
        <CircleCheck
          className="animate-in zoom-in-50 size-10 text-emerald-500 duration-500"
          strokeWidth={1.5}
        />
      </div>
      <div className="mt-5 space-y-1.5 text-center">
        <p className="text-lg font-semibold text-emerald-600">Payment Successful</p>
        <p className="text-sm text-[#6b7c93]">{amount} was charged successfully</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:h-11"
      >
        Make Another Payment
      </button>
    </>
  );
}

function FailedResult({
  errorMsg,
  onRetry,
}: Readonly<{
  errorMsg?: string;
  onRetry?: (() => void) | undefined;
}>): React.ReactNode {
  return (
    <>
      <div className="flex size-20 items-center justify-center rounded-full bg-red-50">
        <CircleX
          className="animate-in zoom-in-50 size-10 text-red-400 duration-500"
          strokeWidth={1.5}
        />
      </div>
      <div className="mt-5 space-y-1.5 text-center">
        <p className="text-lg font-semibold text-red-500">Payment Failed</p>
        <p className="text-sm text-[#6b7c93]">
          {errorMsg || "We couldn\u0027t process your payment. Please try again."}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:h-11"
        >
          Try Again
        </button>
      )}
    </>
  );
}

export function PaymentResult({
  status,
  amount,
  errorMsg,
  onClose,
  onRetry,
}: PaymentResultProps): React.ReactNode {
  return (
    <div className="flex flex-col items-center px-1 py-4 text-center sm:px-0 sm:py-6">
      {status === "processing" && <ProcessingIndicator />}
      {status === "success" && <SuccessResult amount={amount} onClose={onClose} />}
      {status === "failed" && <FailedResult errorMsg={errorMsg} onRetry={onRetry} />}
    </div>
  );
}
