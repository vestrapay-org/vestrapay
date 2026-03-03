"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX } from "@/components/icons";
import type { ActivePaymentStatus } from "@/lib/types";

const PROCESSING_STEPS = [
  "Encrypting card details",
  "Contacting your bank",
  "Verifying transaction",
  "Finalizing payment",
] as const;

type ProcessingStep = (typeof PROCESSING_STEPS)[number];

interface PaymentResultProps {
  readonly status: ActivePaymentStatus;
  readonly amount: string;
  readonly reference: string;
  readonly onClose: () => void;
  readonly onRetry?: (() => void) | undefined;
}

function ProcessingIndicator(): React.ReactNode {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((s) => (s < PROCESSING_STEPS.length - 1 ? s + 1 : s));
    }, 700);
    return () => clearInterval(stepInterval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 92));
    }, 50);
    return () => clearInterval(progressInterval);
  }, []);

  return (
    <>
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

      <div className="mt-5 space-y-1.5 text-center">
        <p className="text-lg font-semibold text-[#3c4257]">Processing payment</p>
        <p className="text-sm text-[#6b7c93]">Please do not close this window</p>
      </div>

      <div className="mt-5 w-full space-y-2">
        {PROCESSING_STEPS.map((step: ProcessingStep, i: number) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <div
              key={step}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-300 ${
                isDone
                  ? "text-emerald-600"
                  : isActive
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-[#a3acb9]"
              }`}
            >
              <div className="flex size-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <CircleCheck className="size-4 text-emerald-500" strokeWidth={2} />
                ) : isActive ? (
                  <div className="size-2.5 animate-pulse rounded-full bg-current" />
                ) : (
                  <div className="size-1.5 rounded-full bg-current opacity-50" />
                )}
              </div>
              {step}
            </div>
          );
        })}
      </div>
    </>
  );
}

function SuccessResult({
  amount,
  reference,
  onClose,
}: Readonly<{
  amount: string;
  reference: string;
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
      <div className="mt-5 rounded-lg bg-[#f6f9fc] px-4 py-2.5">
        <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">Reference</p>
        <p className="mt-0.5 font-mono text-xs text-[#3c4257]">{reference}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:mt-6 sm:h-11"
      >
        Done
      </button>
    </>
  );
}

function FailedResult({
  reference,
  onClose,
  onRetry,
}: Readonly<{
  reference: string;
  onClose: () => void;
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
          We couldn&apos;t process your payment. Please try again.
        </p>
      </div>
      <div className="mt-5 rounded-lg bg-[#f6f9fc] px-4 py-2.5">
        <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">Reference</p>
        <p className="mt-0.5 font-mono text-xs text-[#3c4257]">{reference}</p>
      </div>
      <div className="mt-5 flex w-full gap-3 sm:mt-6">
        <button
          type="button"
          onClick={onClose}
          className="h-10 flex-1 cursor-pointer rounded-lg border border-[#e3e8ee] text-sm font-medium text-[#6b7c93] transition-colors hover:bg-[#f6f9fc] sm:h-11"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 flex-1 cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:h-11"
        >
          Try Again
        </button>
      </div>
    </>
  );
}

export function PaymentResult({
  status,
  amount,
  reference,
  onClose,
  onRetry,
}: PaymentResultProps): React.ReactNode {
  return (
    <div className="flex flex-col items-center px-1 py-4 text-center sm:px-0 sm:py-6">
      {status === "processing" && <ProcessingIndicator />}
      {status === "success" && (
        <SuccessResult amount={amount} reference={reference} onClose={onClose} />
      )}
      {status === "failed" && (
        <FailedResult reference={reference} onClose={onClose} onRetry={onRetry} />
      )}
    </div>
  );
}
