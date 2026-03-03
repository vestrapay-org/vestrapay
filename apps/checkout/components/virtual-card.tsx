"use client";

import { CardBrandIcon } from "@/components/card-brands";
import type { CardBrand } from "@/lib/types";

interface VirtualCardProps {
  readonly cardNumber: string;
  readonly expiry: string;
  readonly cvv: string;
  readonly cardholderName: string;
  readonly brand: CardBrand;
  readonly isFlipped: boolean;
}

interface CardFaceProps {
  readonly brand: CardBrand;
}

interface CardFrontProps extends CardFaceProps {
  readonly cardNumber: string;
  readonly expiry: string;
  readonly cardholderName: string;
}

interface CardBackProps extends CardFaceProps {
  readonly cvv: string;
}

const SIGNATURE_STRIPES: ReadonlyArray<{ key: string; lightness: number }> = Array.from(
  { length: 20 },
  (_, i) => ({
    key: `s-${i}`,
    lightness: 50 + Math.sin(i * 0.7) * 15,
  }),
);

function ChipIcon(): React.ReactNode {
  return (
    <div className="relative h-7 w-9">
      <div className="absolute inset-0 rounded bg-linear-to-br from-[#f0c27f] via-[#e6b96e] to-[#c9952c] shadow-sm shadow-black/20" />
      <div className="absolute inset-x-0 top-[45%] h-px bg-[#b8860b]/40" />
      <div className="absolute inset-y-0 left-[35%] w-px bg-[#b8860b]/30" />
      <div className="absolute inset-y-0 left-[65%] w-px bg-[#b8860b]/30" />
      <div className="absolute top-[25%] left-[35%] h-[50%] w-[30%] rounded-sm border border-[#b8860b]/25" />
    </div>
  );
}

function ContactlessIcon(): React.ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-50">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"
        stroke="white"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
        stroke="white"
        strokeWidth="0.8"
        fill="none"
      />
    </svg>
  );
}

function BrandDisplay({
  brand,
  className,
}: CardFaceProps & { readonly className: string }): React.ReactNode {
  if (brand === "unknown") {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <div className="size-4 rounded-full border border-white/15 bg-white/10" />
        <div className="-ml-1.5 size-4 rounded-full border border-white/15 bg-white/10" />
      </div>
    );
  }

  return (
    <div className={`animate-in fade-in-0 zoom-in-75 duration-300 ${className}`}>
      <CardBrandIcon brand={brand} className="size-full" />
    </div>
  );
}

function CardFront({ cardNumber, expiry, cardholderName, brand }: CardFrontProps): React.ReactNode {
  const displayNumber = cardNumber || "•••• •••• •••• ••••";
  const displayExpiry = expiry || "MM/YY";
  const displayName = cardholderName || "YOUR NAME";

  return (
    <div className="card-face absolute inset-0 overflow-hidden rounded-lg bg-linear-to-br from-[#34287b] via-[#3d2f91] to-[#271d5e] p-3 text-white shadow-lg shadow-[#34287b]/30 sm:rounded-xl sm:p-4">
      <div className="absolute inset-0 opacity-[0.06]">
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
          <circle cx="360" cy="-20" r="180" fill="white" />
          <circle cx="40" cy="220" r="140" fill="white" />
        </svg>
      </div>

      <div className="absolute top-0 right-0 h-full w-1/2 opacity-[0.03]">
        <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="none">
          <path d="M0 0 Q200 50 150 200 L200 200 L200 0 Z" fill="white" />
        </svg>
      </div>

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <ChipIcon />
            <ContactlessIcon />
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[8px] font-bold tracking-[0.25em] uppercase opacity-40">
              Vestrapay
            </span>
            <BrandDisplay brand={brand} className="h-6 w-10" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.18em] text-white/95 transition-all duration-200 sm:text-sm sm:tracking-[0.2em]">
            {displayNumber}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[7px] font-medium tracking-wider uppercase opacity-35">
                Card Holder
              </p>
              <p className="max-w-32 truncate font-mono text-[11px] tracking-wider text-white/80 uppercase transition-all duration-200">
                {displayName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-medium tracking-wider uppercase opacity-35">
                Valid Thru
              </p>
              <p className="font-mono text-[11px] tracking-widest text-white/80 transition-all duration-200">
                {displayExpiry}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({ cvv, brand }: CardBackProps): React.ReactNode {
  const displayCvv = cvv || "•••";

  return (
    <div className="card-face card-face-back absolute inset-0 overflow-hidden rounded-lg bg-linear-to-br from-[#2a2064] via-[#34287b] to-[#1e1555] shadow-lg shadow-[#34287b]/30 sm:rounded-xl">
      <div className="mt-5 h-9 w-full bg-[#1a1245]" />

      <div className="mt-4 px-4">
        <div className="flex items-center">
          <div className="h-7 flex-1 rounded-l bg-linear-to-r from-[#d4d4d4] via-[#e8e8e8] to-[#d4d4d4]">
            <div className="flex h-full items-center px-2">
              {SIGNATURE_STRIPES.map(({ key, lightness }) => (
                <div
                  key={key}
                  className="mx-px h-3 w-0.5 rounded-full"
                  style={{ backgroundColor: `hsl(0 0% ${lightness}%)` }}
                />
              ))}
            </div>
          </div>
          <div className="flex h-7 w-12 items-center justify-center rounded-r bg-white font-mono text-xs font-bold tracking-widest text-[#3c4257]">
            {displayCvv}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 px-4">
        <div className="h-4 w-24 rounded-sm bg-white/5" />
        <div className="h-4 w-32 rounded-sm bg-white/5" />
        <div className="h-4 w-20 rounded-sm bg-white/5" />
      </div>

      <div className="absolute right-4 bottom-4">
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-bold tracking-[0.2em] text-white/30 uppercase">
            Vestrapay
          </span>
          {brand !== "unknown" && (
            <div className="h-5 w-8 opacity-80">
              <CardBrandIcon brand={brand} className="h-5 w-8" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function VirtualCard({
  cardNumber,
  expiry,
  cvv,
  cardholderName,
  brand,
  isFlipped,
}: VirtualCardProps): React.ReactNode {
  return (
    <div className="card-perspective mb-3 h-44 w-full select-none sm:mb-4 sm:h-52">
      <div
        className={`card-inner relative h-full w-full transition-transform duration-500 ${
          isFlipped ? "card-flipped" : ""
        }`}
      >
        <CardFront
          cardNumber={cardNumber}
          expiry={expiry}
          cardholderName={cardholderName}
          brand={brand}
        />
        <CardBack cvv={cvv} brand={brand} />
      </div>
    </div>
  );
}
