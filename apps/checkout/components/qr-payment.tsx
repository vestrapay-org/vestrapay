"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@vestrapay/ui/components/button";
import { QrCode, Loader2 } from "@/components/icons";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentSimulation } from "@/hooks/use-payment-simulation";
import { generateQRPattern } from "@/lib/qr";
import type { PaymentComponentProps } from "@/lib/types";

export function QRCodePayment({ amount, reference }: PaymentComponentProps): React.ReactNode {
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { status, simulate, reset } = usePaymentSimulation({ delay: 3500 });
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const qrPattern = useMemo(generateQRPattern, []);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
    };
  }, []);

  function handleGenerate(): void {
    setGenerating(true);
    generateTimeoutRef.current = setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
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
          setGenerated(false);
        }}
        onRetry={simulate}
      />
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-5 duration-300">
      {!generated ? (
        <>
          <p className="text-sm leading-relaxed text-[#6b7c93]">
            Generate a QR code and scan it with your bank&apos;s mobile app or any NQR-supported app
            to pay <span className="font-semibold text-[#3c4257]">{amount}</span>.
          </p>

          <div className="flex flex-col items-center rounded-lg border border-[#e3e8ee] bg-[#f6f9fc] p-5 sm:p-8">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-[#edf2f7]">
              <QrCode className="size-10 text-[#a3acb9]" />
            </div>
            <p className="mt-4 text-sm text-[#a3acb9]">QR code will appear here</p>
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
              "Generate QR Code"
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-[#6b7c93]">
            Scan the QR code below with your bank&apos;s app to pay{" "}
            <span className="font-semibold text-[#3c4257]">{amount}</span>.
          </p>

          <div className="animate-in fade-in-0 zoom-in-95 flex flex-col items-center rounded-lg border border-[#e3e8ee] bg-white p-5 duration-500 sm:p-8">
            <div className="relative size-36 sm:size-48">
              <svg viewBox="0 0 200 200" className="size-full text-[#3c4257]" fill="currentColor">
                <rect x="10" y="10" width="50" height="50" rx="4" fillOpacity="0.9" />
                <rect x="16" y="16" width="38" height="38" rx="2" fill="white" />
                <rect x="24" y="24" width="22" height="22" rx="2" fillOpacity="0.9" />

                <rect x="140" y="10" width="50" height="50" rx="4" fillOpacity="0.9" />
                <rect x="146" y="16" width="38" height="38" rx="2" fill="white" />
                <rect x="154" y="24" width="22" height="22" rx="2" fillOpacity="0.9" />

                <rect x="10" y="140" width="50" height="50" rx="4" fillOpacity="0.9" />
                <rect x="16" y="146" width="38" height="38" rx="2" fill="white" />
                <rect x="24" y="154" width="22" height="22" rx="2" fillOpacity="0.9" />

                {qrPattern.map((cell) =>
                  cell.visible ? (
                    <rect
                      key={cell.key}
                      x={cell.x}
                      y={cell.y}
                      width="8"
                      height="8"
                      rx="1"
                      fillOpacity={0.85}
                    />
                  ) : null,
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex size-12 items-center justify-center rounded-lg bg-white">
                  <span className="text-primary text-sm font-black tracking-tight">VP</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#a3acb9]">Scan with any NQR-supported banking app</p>
          </div>

          <Button
            variant="outline"
            className="h-10 w-full cursor-pointer rounded-lg border-[#e3e8ee] text-sm font-medium tracking-wide text-[#3c4257] transition-all duration-200 hover:bg-[#f6f9fc] sm:h-11 sm:text-[15px]"
            size="lg"
            onClick={simulate}
          >
            I&apos;ve completed the payment
          </Button>
        </>
      )}
    </div>
  );
}
