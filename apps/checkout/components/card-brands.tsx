"use client";

import type { CardBrand, SVGIconProps } from "@/lib/types";

export function MastercardLogo({ className }: SVGIconProps): React.ReactNode {
  return (
    <svg
      viewBox="0 0 48 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mastercard"
    >
      <circle cx="18" cy="15" r="12" fill="#EB001B" />
      <circle cx="30" cy="15" r="12" fill="#F79E1B" />
      <path
        d="M24 5.64a11.95 11.95 0 0 1 4.36 9.36A11.95 11.95 0 0 1 24 24.36 11.95 11.95 0 0 1 19.64 15 11.95 11.95 0 0 1 24 5.64Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function VisaLogo({ className }: SVGIconProps): React.ReactNode {
  return (
    <svg
      viewBox="0 0 48 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Visa"
    >
      <path
        d="M19.22 0.5L15.84 15.5h-3.6l3.38-15h3.6zM33.18 10.3l1.9-5.22 1.09 5.22h-2.99zm4.02 5.2h3.33L37.6 0.5h-3.07a1.53 1.53 0 0 0-1.43.95l-5.04 14.05h3.52l.7-1.94h4.3l.62 1.94zM28.46 10.58c.02-3.95-5.47-4.17-5.43-5.93.01-.54.52-1.11 1.64-1.25a7.27 7.27 0 0 1 3.82.67L29.16.8A10.42 10.42 0 0 0 25.53 0C22.2 0 19.85 1.76 19.83 4.28c-.02 1.87 1.67 2.91 2.94 3.53 1.31.63 1.75 1.04 1.74 1.6-.01.87-1.04 1.25-2.01 1.27-1.69.02-2.67-.46-3.45-.82l-.61 2.85c.78.36 2.23.68 3.73.69 3.53 0 5.84-1.74 5.29-2.82zM11.85 0.5L6.24 15.5H2.7L-0.03 3.02C-0.2 2.27-.34 1.98-.89 1.5-1.8.77-3.28.1-4.52-.2L-4.44 0.5h5.71a1.56 1.56 0 0 1 1.54 1.32l1.41 7.52L7.7 0.5h3.53l.62 0z"
        fill="#1434CB"
        transform="translate(5, 0)"
      />
    </svg>
  );
}

export function VerveIcon({ className }: SVGIconProps): React.ReactNode {
  return (
    <div
      className={`flex items-center justify-center font-black tracking-tight ${className}`}
    >
      <span className="text-[10px] text-red-600">Verve</span>
    </div>
  );
}

export function detectCardBrand(number: string): CardBrand {
  const digits = number.replace(/\s/g, "");
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^4/.test(digits)) return "visa";
  if (/^(506[01]|6500)/.test(digits)) return "verve";
  return "unknown";
}

interface CardBrandIconProps {
  readonly brand: CardBrand;
  readonly className?: string;
}

export function CardBrandIcon({
  brand,
  className,
}: CardBrandIconProps): React.ReactNode {
  switch (brand) {
    case "mastercard":
      return <MastercardLogo className={className} />;
    case "visa":
      return <VisaLogo className={className} />;
    case "verve":
      return <VerveIcon className={className} />;
    default:
      return null;
  }
}
