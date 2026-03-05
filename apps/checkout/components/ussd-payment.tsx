"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@vestrapay/ui/components/button";
import { Hash, Copy, Check, Loader2 } from "@/components/icons";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentSimulation } from "@/hooks/use-payment-simulation";
import { useClipboard } from "@/hooks/use-clipboard";
import { USSD_BANKS } from "@/lib/constants";
import type { PaymentComponentProps } from "@/lib/types";

export function USSDPayment({ amount, reference }: PaymentComponentProps): React.ReactNode {
  const [selected, setSelected] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { status, simulate, reset } = usePaymentSimulation({ delay: 3500 });
  const { copied, copy } = useClipboard();
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
    };
  }, []);

  const selectedBank = USSD_BANKS.find((b) => b.code === selected);

  function handleGenerate(): void {
    if (selectedBank) {
      setGenerating(true);
      generateTimeoutRef.current = setTimeout(() => {
        setUssdCode(`${selectedBank.ussd.replace("#", "")}*000*8347291#`);
        setGenerating(false);
      }, 1200);
    }
  }

  if (status !== "idle") {
    return (
      <PaymentResult
        status={status}
        amount={amount}
        reference={reference}
        onClose={() => {
          reset();
          setUssdCode(null);
          setSelected(null);
        }}
        onRetry={simulate}
      />
    );
  }

  const [search, setSearch] = useState("");
  const filtered = USSD_BANKS.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300">
      <p className="text-sm leading-relaxed text-[#6b7c93]">
        Select your bank to generate a USSD code for this payment.
      </p>

      <div className="relative">
        <input
          type="text"
          placeholder="Search for your bank"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-lg border border-[#e3e8ee] bg-white px-4 text-sm text-[#3c4257] transition-all duration-200 outline-none placeholder:text-[#a3acb9]"
        />
      </div>

      <div className="stripe-scroll max-h-48 overflow-y-auto rounded-lg border border-[#e3e8ee] sm:max-h-55">
        {filtered.map((bank, i) => (
          <button
            key={bank.code}
            type="button"
            onClick={() => {
              setSelected(bank.code);
              setUssdCode(null);
            }}
            className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm transition-all duration-150 ${
              selected === bank.code
                ? "bg-primary/4 text-primary font-medium"
                : "text-[#3c4257] hover:bg-[#f6f9fc]"
            } ${i !== filtered.length - 1 ? "border-b border-[#e3e8ee]" : ""}`}
          >
            <span className="flex items-center gap-2.5">
              <Hash className="size-3.5 shrink-0 text-[#a3acb9]" />
              {bank.name}
            </span>
            <span className="text-xs text-[#a3acb9]">{bank.ussd}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[#a3acb9]">No banks found</div>
        )}
      </div>

      {ussdCode && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-lg border border-[#e3e8ee] bg-[#f6f9fc] p-5 text-center duration-300">
          <p className="text-[10px] font-medium tracking-wider text-[#8898aa] uppercase">
            Dial this code on your phone
          </p>
          <p className="text-primary mt-2 text-xl font-bold tracking-wider sm:text-2xl">
            {ussdCode}
          </p>
          <button
            type="button"
            onClick={() => copy(ussdCode)}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-[#6b7c93] transition-all duration-200 hover:bg-[#edf2f7]"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy code
              </>
            )}
          </button>
        </div>
      )}

      {!ussdCode && (
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 sm:h-11 sm:text-[15px]"
          size="lg"
          disabled={!selected || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </span>
          ) : selected ? (
            `Generate USSD code for ${selectedBank?.name}`
          ) : (
            "Select a bank"
          )}
        </Button>
      )}

      {ussdCode && (
        <Button
          variant="outline"
          className="h-10 w-full cursor-pointer rounded-lg border-[#e3e8ee] text-sm font-medium tracking-wide text-[#3c4257] transition-all duration-200 hover:bg-[#f6f9fc] sm:h-11 sm:text-[15px]"
          size="lg"
          onClick={simulate}
        >
          I&apos;ve dialed the code
        </Button>
      )}
    </div>
  );
}
