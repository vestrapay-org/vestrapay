export type PaymentMethod = "card" | "bank" | "transfer" | "ussd" | "qr";

export type PaymentStatus = "idle" | "processing" | "success" | "failed";

export type ActivePaymentStatus = Exclude<PaymentStatus, "idle">;

export type CardBrand = "mastercard" | "visa" | "verve" | "unknown";

export interface PaymentComponentProps {
  readonly amount: string;
  readonly amountInSmallestUnit: number;
  readonly reference: string;
  readonly email: string;
  readonly currency: string;
  readonly onPaymentSuccess?: (reference: string) => void;
  readonly onPaymentFailed?: (reference: string, errorMsg?: string) => void;
}

export interface Bank {
  readonly code: string;
  readonly name: string;
}

export interface USSDBank extends Bank {
  readonly ussd: string;
}

export interface Merchant {
  readonly name: string;
  readonly email: string;
  readonly amount: number;
  readonly currency: string;
  readonly reference: string;
}

export interface SVGIconProps {
  readonly className?: string;
  readonly active?: boolean;
}

export interface QRCell {
  readonly x: number;
  readonly y: number;
  readonly key: string;
  readonly visible: boolean;
}

export interface ChargeCardRequest {
  readonly amount: number;
  readonly currency: string;
  readonly email: string;
  readonly description?: string;
  readonly card: {
    readonly number: string;
    readonly cvv: string;
    readonly expiryMonth: string;
    readonly expiryYear: string;
  };
}

export type ChargeCardStatus = "success" | "3ds_required" | "failed";

export interface ChargeCardData {
  readonly status: ChargeCardStatus;
  readonly reference: string;
  readonly threeDsHtml: string | null;
}

export interface ApiResponse<T> {
  readonly metadata: {
    readonly language: string;
    readonly timestamp: number;
    readonly timezone: string;
    readonly path: string;
    readonly version: string;
    readonly repoVersion: string;
  };
  readonly message: string;
  readonly statusCode: number;
  readonly data: T;
}

export interface ThreeDsCompleteRequest {
  readonly reference: string;
}

export type ThreeDsCompleteData = ChargeCardData;

export type VerifyTransactionStatus = "pending" | "processing" | "success" | "failed";

export interface VerifyTransactionData {
  readonly status: VerifyTransactionStatus;
  readonly amount: number;
  readonly currency: string;
  readonly channel: string;
  readonly reference: string;
  readonly paidAt: string | null;
  readonly fees: number;
  readonly metadata: Record<string, unknown> | null;
}
