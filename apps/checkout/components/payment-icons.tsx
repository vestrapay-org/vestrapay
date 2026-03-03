"use client";

import type { SVGIconProps } from "@/lib/types";

const GRAY = "#9ca3af";
const GRAY_LIGHT = "#d1d5db";
const GRAY_DARK = "#6b7280";

export function CardIcon({ className, active = false }: SVGIconProps): React.ReactNode {
  const primary = active ? "#635BFF" : GRAY;
  const secondary = active ? "#4B45C6" : GRAY_DARK;
  const accent = active ? "#A5A2FF" : GRAY_LIGHT;
  const chip = active ? "#FFD700" : GRAY_LIGHT;

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="4" y="10" width="32" height="20" rx="3" fill={primary} />
      <rect x="4" y="15" width="32" height="4" fill={secondary} />
      <rect x="8" y="23" width="10" height="2" rx="1" fill={accent} />
      <rect x="8" y="12" width="6" height="4" rx="1" fill={chip} />
    </svg>
  );
}

export function BankIcon({ className, active = false }: SVGIconProps): React.ReactNode {
  const fill = active ? "#0A84FF" : GRAY;

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <path d="M20 6L4 16h32L20 6z" fill={fill} />
      <rect x="9" y="18" width="3" height="12" rx="0.5" fill={fill} opacity="0.8" />
      <rect x="18.5" y="18" width="3" height="12" rx="0.5" fill={fill} opacity="0.8" />
      <rect x="28" y="18" width="3" height="12" rx="0.5" fill={fill} opacity="0.8" />
      <rect x="5" y="30" width="30" height="3" rx="1" fill={fill} />
    </svg>
  );
}

export function TransferIcon({ className, active = false }: SVGIconProps): React.ReactNode {
  const primary = active ? "#34C759" : GRAY;
  const secondary = active ? "#30B350" : GRAY_LIGHT;

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="8" y="14" width="18" height="3" rx="1.5" fill={primary} />
      <path
        d="M24 10l6 5.5-6 5.5"
        stroke={primary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="14" y="24" width="18" height="3" rx="1.5" fill={secondary} opacity="0.65" />
      <path
        d="M16 30l-6-5.5 6-5.5"
        stroke={secondary}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.65"
      />
    </svg>
  );
}

export function USSDIcon({ className, active = false }: SVGIconProps): React.ReactNode {
  const fill = active ? "#FF9500" : GRAY;

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="12" y="4" width="16" height="32" rx="3" fill={fill} />
      <rect x="14" y="8" width="12" height="20" rx="1" fill="white" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        fontSize="11"
        fontWeight="bold"
        fontFamily="system-ui"
      >
        #
      </text>
      <circle cx="20" cy="32" r="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

export function QRIcon({ className, active = false }: SVGIconProps): React.ReactNode {
  const fill = active ? "#AF52DE" : GRAY;

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="5" y="5" width="12" height="12" rx="2" fill={fill} />
      <rect x="7" y="7" width="8" height="8" rx="1" fill="white" />
      <rect x="9" y="9" width="4" height="4" rx="0.5" fill={fill} />
      <rect x="23" y="5" width="12" height="12" rx="2" fill={fill} />
      <rect x="25" y="7" width="8" height="8" rx="1" fill="white" />
      <rect x="27" y="9" width="4" height="4" rx="0.5" fill={fill} />
      <rect x="5" y="23" width="12" height="12" rx="2" fill={fill} />
      <rect x="7" y="25" width="8" height="8" rx="1" fill="white" />
      <rect x="9" y="27" width="4" height="4" rx="0.5" fill={fill} />
      <rect x="20" y="20" width="3" height="3" rx="0.5" fill={fill} opacity="0.7" />
      <rect x="25" y="20" width="3" height="3" rx="0.5" fill={fill} opacity="0.5" />
      <rect x="30" y="20" width="3" height="3" rx="0.5" fill={fill} opacity="0.7" />
      <rect x="20" y="25" width="3" height="3" rx="0.5" fill={fill} opacity="0.5" />
      <rect x="25" y="25" width="3" height="3" rx="0.5" fill={fill} opacity="0.7" />
      <rect x="30" y="25" width="3" height="3" rx="0.5" fill={fill} opacity="0.5" />
      <rect x="20" y="30" width="3" height="3" rx="0.5" fill={fill} opacity="0.7" />
      <rect x="25" y="30" width="3" height="3" rx="0.5" fill={fill} opacity="0.5" />
      <rect x="30" y="30" width="3" height="3" rx="0.5" fill={fill} opacity="0.7" />
    </svg>
  );
}
