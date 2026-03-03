"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseClipboardReturn {
  readonly copied: boolean;
  readonly copy: (text: string) => void;
}

export function useClipboard(resetDelay = 2000): UseClipboardReturn {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopied(true);
          timeoutRef.current = setTimeout(() => setCopied(false), resetDelay);
        })
        .catch(() => {
          setCopied(false);
        });
    },
    [resetDelay],
  );

  return { copied, copy };
}
