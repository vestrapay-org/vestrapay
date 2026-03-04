"use client";

import { useEffect, useRef, useCallback } from "react";
import { verifyTransaction } from "@/lib/api";
import type { VerifyTransactionStatus } from "@/lib/types";

interface UseTransactionPollerOptions {
  readonly reference: string;
  readonly enabled: boolean;
  readonly intervalMs?: number;
  readonly maxAttempts?: number;
  readonly onSettled: (status: "success" | "failed") => void;
}

export function useTransactionPoller({
  reference,
  enabled,
  intervalMs = 3_000,
  maxAttempts = 60,
  onSettled,
}: UseTransactionPollerOptions): void {
  const attemptsRef = useRef(0);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const poll = useCallback(async () => {
    try {
      const res = await verifyTransaction(reference);
      const status: VerifyTransactionStatus = res.data.status;

      if (status === "success" || status === "failed") {
        onSettledRef.current(status);
        return true;
      }
    } catch {}

    return false;
  }, [reference]);

  useEffect(() => {
    if (!enabled || !reference) return;

    attemptsRef.current = 0;
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      attemptsRef.current += 1;

      const done = await poll();
      if (done || cancelled || attemptsRef.current >= maxAttempts) {
        clearInterval(timer);
      }
    };

    timer = setInterval(() => void tick(), intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, reference, intervalMs, maxAttempts, poll]);
}
