"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PaymentStatus } from "@/lib/types";

interface UsePaymentSimulationOptions {
  readonly delay?: number;
  readonly successRate?: number;
}

interface UsePaymentSimulationReturn {
  readonly status: PaymentStatus;
  readonly simulate: () => void;
  readonly reset: () => void;
}

export function usePaymentSimulation({
  delay = 3000,
  successRate = 0.8,
}: UsePaymentSimulationOptions = {}): UsePaymentSimulationReturn {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const simulate = useCallback(() => {
    setStatus("processing");
    timeoutRef.current = setTimeout(() => {
      setStatus(Math.random() < successRate ? "success" : "failed");
    }, delay);
  }, [delay, successRate]);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("idle");
  }, []);

  return { status, simulate, reset };
}
