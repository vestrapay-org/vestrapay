"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@vestrapay/ui/components/button";
import { Loader2, ChevronDown } from "@/components/icons";
import { PaymentResult } from "@/components/payment-result";
import { chargeBankPayment, getBankPaymentBanks, verifyTransaction } from "@/lib/api";
import type {
  PaymentComponentProps,
  ActivePaymentStatus,
  ChargeBankPaymentData,
  VerifyTransactionStatus,
} from "@/lib/types";

const POLL_INTERVAL_MS = 2000 as const;

type BankPaymentStatus = "idle" | "loading" | "redirect" | "processing" | "success" | "failed";

interface BankPaymentState {
  status: BankPaymentStatus;
  selectedBankCode: string | null;
  banks: Array<{ code: string; name: string; slug: string }>;
  data: ChargeBankPaymentData | null;
  error: string | null;
  pollingReference: string | null;
}

export function BankPayment({
  amount,
  amountInSmallestUnit,
  reference,
  email,
  currency,
  onPaymentSuccess,
  onPaymentFailed,
}: PaymentComponentProps): React.ReactNode {
  const [state, setState] = useState<BankPaymentState>({
    status: "idle",
    selectedBankCode: null,
    banks: [],
    data: null,
    error: null,
    pollingReference: null,
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load available banks on mount
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const res = await getBankPaymentBanks();
        setState((prev) => ({ ...prev, banks: res.data }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load banks";
        setState((prev) => ({ ...prev, error: msg }));
      }
    };
    loadBanks();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
    };
  }, []);

  // Auto-polling when payment is initiated
  useEffect(() => {
    if (state.status !== "processing" || !state.pollingReference) return;

    const ref = state.pollingReference;

    const poll = async (): Promise<void> => {
      try {
        const res = await verifyTransaction(ref);
        const txnStatus: VerifyTransactionStatus = res.data.status;

        if (txnStatus === "success") {
          setState((prev) => ({ ...prev, status: "success" }));
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          onPaymentSuccess?.(ref);
        } else if (txnStatus === "failed") {
          setState((prev) => ({ ...prev, status: "failed" }));
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          onPaymentFailed?.(ref);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Start polling immediately with first check after 1 second
    setTimeout(poll, 1000);
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [state.status, state.pollingReference, onPaymentSuccess, onPaymentFailed]);

  const handleBankSelect = useCallback((bankCode: string) => {
    setState((prev) => ({ ...prev, selectedBankCode: bankCode, error: null }));
  }, []);

  const handleInitiate = useCallback(async () => {
    if (!state.selectedBankCode) {
      setState((prev) => ({ ...prev, error: "Please select a bank" }));
      return;
    }

    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const res = await chargeBankPayment({
        amount: amountInSmallestUnit,
        currency,
        email,
        bankCode: state.selectedBankCode,
        description: `Bank payment ${reference}`,
        redirectUrl: `${window.location.origin}?payment_reference=${reference}`,
        merchantBearsCost: true,
      });

      setState((prev) => ({
        ...prev,
        data: res.data,
        pollingReference: res.data.paymentReference,
        status: "redirect",
      }));

      // Redirect to authorization URL after a brief delay
      redirectTimeoutRef.current = setTimeout(() => {
        window.location.href = res.data.redirectUrl;
        setState((prev) => ({ ...prev, status: "processing" }));
      }, 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate payment";
      setState((prev) => ({ ...prev, status: "idle", error: msg }));
    }
  }, [state.selectedBankCode, amountInSmallestUnit, currency, email, reference]);

  const handleRetry = useCallback(() => {
    setState({
      status: "idle",
      selectedBankCode: null,
      banks: state.banks,
      data: null,
      error: null,
      pollingReference: null,
    });
  }, [state.banks]);

  const handleClose = useCallback(() => {
    handleRetry();
  }, [handleRetry]);

  // Loading banks
  if (state.banks.length === 0 && state.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <Loader2 className="text-primary mb-4 size-6 animate-spin" />
        <p className="text-sm text-[#6b7c93]">Loading available banks...</p>
      </div>
    );
  }

  // Success/Failed result
  if (state.status === "success" || state.status === "failed") {
    return (
      <PaymentResult
        status={state.status as ActivePaymentStatus}
        amount={amount}
        reference={state.pollingReference ?? reference}
        errorMsg={state.error ?? undefined}
        onClose={handleClose}
        onRetry={handleInitiate}
      />
    );
  }

  // Redirect/Processing state
  if (state.status === "redirect" || state.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 flex justify-center">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
        <p className="text-lg font-semibold text-[#3c4257]">
          {state.status === "redirect" ? "Redirecting..." : "Verifying your payment"}
        </p>
        <p className="mt-2 text-center text-sm text-[#6b7c93]">
          {state.status === "redirect"
            ? "Please complete the authorization in your browser"
            : `We're confirming your payment of ${amount}`}
        </p>
      </div>
    );
  }

  // Bank selection form
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 duration-300">
      <p className="text-sm leading-relaxed text-[#6b7c93]">
        Select your bank and authorize the debit mandate. You'll be redirected to complete the
        payment of <span className="font-semibold text-[#3c4257]">{amount}</span>.
      </p>

      <div className="space-y-3">
        <label className="text-xs font-semibold tracking-wide text-[#8898aa] uppercase">
          Select Bank
        </label>
        <div className="relative">
          <select
            value={state.selectedBankCode ?? ""}
            onChange={(e) => handleBankSelect(e.target.value)}
            disabled={state.status === "loading"}
            className="focus:border-primary focus:ring-primary/10 w-full appearance-none rounded-lg border border-[#e3e8ee] bg-white px-4 py-3 pr-10 text-sm text-[#3c4257] transition-all duration-200 hover:border-[#d1d5db] focus:ring-2 focus:outline-none disabled:bg-[#f6f9fc] disabled:text-[#a0aec0]"
          >
            <option value="">Choose a bank...</option>
            {state.banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-[#8898aa]" />
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-60 sm:h-11 sm:text-[15px]"
        size="lg"
        onClick={handleInitiate}
        disabled={!state.selectedBankCode || state.status === "loading"}
      >
        {state.status === "loading" ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Processing...
          </span>
        ) : (
          "Continue to Bank"
        )}
      </Button>

      <p className="text-xs text-[#8898aa]">
        You will be redirected to your bank to authorize this payment.
      </p>
    </div>
  );
}
