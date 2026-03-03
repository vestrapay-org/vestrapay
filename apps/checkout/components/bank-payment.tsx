"use client";

import { useState } from "react";
import { Button } from "@vestrapay/ui/components/button";
import { ChevronRight } from "@/components/icons";
import { PaymentResult } from "@/components/payment-result";
import { usePaymentSimulation } from "@/hooks/use-payment-simulation";
import { BANKS } from "@/lib/constants";
import type { PaymentComponentProps } from "@/lib/types";

export function BankPayment({ amount, reference }: PaymentComponentProps): React.ReactNode {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { status, simulate, reset } = usePaymentSimulation({ delay: 3500 });

  const filtered = BANKS.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  const selectedBank = BANKS.find((b) => b.code === selected);

  if (status !== "idle") {
    return (
      <PaymentResult
        status={status}
        amount={amount}
        reference={reference}
        onClose={() => {
          reset();
          setSelected(null);
        }}
        onRetry={simulate}
      />
    );
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-2 space-y-4 duration-300">
      <p className="text-sm text-[#6b7c93]">Select your bank to pay via internet banking.</p>

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
            onClick={() => setSelected(bank.code)}
            className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm transition-all duration-150 ${
              selected === bank.code
                ? "bg-primary/4 text-primary font-medium"
                : "text-[#3c4257] hover:bg-[#f6f9fc]"
            } ${i !== filtered.length - 1 ? "border-b border-[#e3e8ee]" : ""}`}
          >
            <span>{bank.name}</span>
            {selected === bank.code && (
              <ChevronRight className="text-primary animate-in slide-in-from-left-2 size-4 duration-200" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[#a3acb9]">No banks found</div>
        )}
      </div>

      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 sm:h-11 sm:text-[15px]"
        size="lg"
        disabled={!selected}
        onClick={simulate}
      >
        {selected ? `Pay ${amount} with ${selectedBank?.name}` : `Select a bank`}
      </Button>
    </div>
  );
}
