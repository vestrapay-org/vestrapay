"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lock, X } from "@/components/icons";
import { CircleCheck, CircleX } from "@/components/icons";
import { CardIcon, BankIcon, TransferIcon, USSDIcon, QRIcon } from "@/components/payment-icons";
import { CardPayment } from "@/components/card-payment";
import { BankPayment } from "@/components/bank-payment";
import { TransferPayment } from "@/components/transfer-payment";
import { USSDPayment } from "@/components/ussd-payment";
import { QRCodePayment } from "@/components/qr-payment";
import { MERCHANT } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import type { PaymentMethod, PaymentComponentProps, SVGIconProps } from "@/lib/types";

interface PaymentMethodConfig {
  readonly id: PaymentMethod;
  readonly label: string;
  readonly icon: React.ComponentType<SVGIconProps>;
}

const PAYMENT_METHODS: readonly PaymentMethodConfig[] = [
  { id: "card", label: "Card", icon: CardIcon },
  { id: "bank", label: "Bank", icon: BankIcon },
  { id: "transfer", label: "Transfer", icon: TransferIcon },
  { id: "ussd", label: "USSD", icon: USSDIcon },
  { id: "qr", label: "QR Code", icon: QRIcon },
];

const PAYMENT_COMPONENTS: Readonly<
  Record<PaymentMethod, React.ComponentType<PaymentComponentProps>>
> = {
  card: CardPayment,
  bank: BankPayment,
  transfer: TransferPayment,
  ussd: USSDPayment,
  qr: QRCodePayment,
};

const TRANSITION_DURATION = 150;

export default function CheckoutPage(): React.ReactNode {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>("card");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayMethod, setDisplayMethod] = useState<PaymentMethod>("card");
  const [paymentSuccess, setPaymentSuccess] = useState<{ reference: string } | null>(null);
  const [paymentFailed, setPaymentFailed] = useState<{
    reference: string;
    errorMsg?: string;
  } | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  const formattedAmount = formatCurrency(MERCHANT.amount, MERCHANT.currency);

  const handleMethodSwitch = useCallback(
    (method: PaymentMethod): void => {
      if (method === activeMethod) return;
      setIsTransitioning(true);
      setActiveMethod(method);
      transitionTimeoutRef.current = setTimeout(() => {
        setDisplayMethod(method);
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    },
    [activeMethod],
  );

  const ActiveComponent = PAYMENT_COMPONENTS[displayMethod];
  const handlePaymentSuccess = useCallback((reference: string) => {
    setPaymentSuccess({ reference });
    setPaymentFailed(null);
  }, []);
  const handlePaymentFailed = useCallback((reference: string, errorMsg?: string) => {
    setPaymentFailed({ reference, errorMsg });
    setPaymentSuccess(null);
  }, []);

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f6f9fc] p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-150">
        <div className="flex min-h-screen flex-col overflow-hidden bg-white sm:min-h-0 sm:flex-row sm:rounded-xl sm:border sm:border-[#e3e8ee]">
          {PAYMENT_METHODS.length > 1 && (
            <nav className="shrink-0 border-b border-[#e3e8ee] sm:w-45 sm:border-r sm:border-b-0 sm:py-6">
              <p className="hidden px-5 pb-3 text-[10px] font-semibold tracking-wider text-[#8898aa] uppercase sm:block">
                Payment Options
              </p>
              <div className="flex overflow-x-auto px-3 py-2 sm:flex-col sm:overflow-x-visible sm:px-0 sm:py-0">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isActive = activeMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleMethodSwitch(method.id)}
                      className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 sm:w-full sm:gap-3 sm:rounded-none sm:px-5 sm:py-3 ${
                        isActive
                          ? "bg-primary/8 text-primary sm:bg-primary/4 sm:border-primary sm:border-r-2"
                          : "border-r-2 border-transparent text-[#8898aa] hover:bg-[#f6f9fc] hover:text-[#6b7c93]"
                      }`}
                    >
                      <Icon className="size-5 sm:size-6" active={isActive} />
                      <span className="text-xs sm:text-[13px]">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          <div className="flex-1">
            {!paymentSuccess && !paymentFailed && (
              <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-5">
                <div className="mb-4 flex items-center justify-between pb-2">
                  <img src="/vestrapay.svg" alt="Vestrapay" className="h-7 w-auto sm:h-8" />
                  <button
                    type="button"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#8898aa] transition-colors hover:bg-[#f6f9fc] hover:text-[#3c4257]"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#3c4257] sm:text-[15px]">
                    {MERCHANT.name}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6b7c93] sm:text-sm">{MERCHANT.email}</p>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[#3c4257] sm:mt-3 sm:text-[32px]">
                  {formattedAmount}
                </p>
              </div>
            )}

            <div
              className="min-h-72 px-4 pt-4 pb-6 transition-opacity duration-150 ease-in-out sm:px-6 sm:pt-5"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              {paymentSuccess ? (
                <div className="flex flex-col items-center px-1 py-4 text-center sm:px-0 sm:py-6">
                  <div className="flex size-20 items-center justify-center rounded-full bg-emerald-50">
                    <CircleCheck
                      className="animate-in zoom-in-50 size-10 text-emerald-500 duration-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-emerald-600">Successful</p>
                  <button
                    type="button"
                    onClick={() => setPaymentSuccess(null)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:h-11"
                  >
                    Make Another Payment
                  </button>
                </div>
              ) : paymentFailed ? (
                <div className="flex flex-col items-center px-1 py-4 text-center sm:px-0 sm:py-6">
                  <div className="flex size-20 items-center justify-center rounded-full bg-red-50">
                    <CircleX
                      className="animate-in zoom-in-50 size-10 text-red-400 duration-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-red-500">Error</p>
                  <button
                    type="button"
                    onClick={() => setPaymentFailed(null)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 h-10 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors sm:h-11"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <ActiveComponent
                  amount={formattedAmount}
                  amountInSmallestUnit={MERCHANT.amount}
                  reference={MERCHANT.reference}
                  email={MERCHANT.email}
                  currency={MERCHANT.currency}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentFailed={handlePaymentFailed}
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 pb-4 sm:pb-0">
          <Lock className="size-3 text-[#8898aa]/60" />
          <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-[#8898aa]">
            Secured by <span className="text-primary font-semibold">Vestrapay</span>
          </span>
        </div>
      </div>
    </main>
  );
}
