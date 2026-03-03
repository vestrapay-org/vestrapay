// ─── Card Processor Types ────────────────────────────────────────────────────

export interface ICardData {
    number: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
    nameOnCard?: string;
}

export interface ICreateSessionResult {
    sessionId: string;
}

export interface IUpdateSessionResult {
    success: boolean;
}

export interface I3dsInitParams {
    sessionId: string;
    orderId: string;
    transactionId: string;
    currency: string;
    orderReference?: string;
}

export interface I3dsInitResult {
    version: '3DS1' | '3DS2' | 'NONE';
    redirectHtml?: string;
    gatewayRecommendation: 'PROCEED' | 'DO_NOT_PROCEED';
}

export interface I3dsAuthParams {
    sessionId: string;
    orderId: string;
    transactionId: string;
    amount: number;
    currency: string;
    redirectResponseUrl: string;
    deviceInfo?: {
        browser?: string;
        ipAddress?: string;
        browserDetails?: {
            screenHeight?: number;
            screenWidth?: number;
            colorDepth?: number;
            javaEnabled?: boolean;
            language?: string;
            timeZone?: number;
        };
    };
}

export interface I3dsAuthResult {
    gatewayRecommendation: 'PROCEED' | 'DO_NOT_PROCEED';
    authenticationHtml?: string;
    authenticationStatus?: string;
    transactionId: string;
}

export interface IPayParams {
    sessionId: string;
    orderId: string;
    authTransactionId: string;
    amount: number;
    currency: string;
    orderReference?: string;
}

export interface IPayResult {
    status: 'success' | 'failed' | 'declined';
    acquirerCode?: string;
    gatewayCode?: string;
    transactionReference?: string;
    processorResponse?: Record<string, unknown>;
}

// ─── Bank Transfer Processor Types ──────────────────────────────────────────

export interface IVirtualAccountParams {
    amount: number;
    currency: string;
    customerEmail: string;
    reference: string;
    customerName?: string;
}

export interface IVirtualAccountResult {
    accountNumber: string;
    bankName: string;
    bankCode?: string;
    accountName: string;
    expiresAt: Date;
    providerReference?: string;
}

export interface IVerifyPaymentResult {
    status: 'success' | 'pending' | 'failed';
    amount: number;
    paidAt?: Date;
    providerReference?: string;
}

export interface IBankInfo {
    name: string;
    code: string;
    slug: string;
    longCode?: string;
    country: string;
    currency: string;
    type?: string;
}

export interface IAccountResolveResult {
    accountName: string;
    accountNumber: string;
    bankCode: string;
}

// ─── USSD Processor Types ───────────────────────────────────────────────────

export interface IUssdChargeParams {
    amount: number;
    currency: string;
    email: string;
    reference: string;
    bankCode?: string;
}

export interface IUssdChargeResult {
    ussdCode: string;
    processorReference: string;
    status: 'pending' | 'processing';
}

export interface IUssdVerifyResult {
    status: 'success' | 'pending' | 'failed';
    amount: number;
    paidAt?: Date;
}

// ─── Webhook Types ──────────────────────────────────────────────────────────

export interface IWebhookEvent {
    eventType: string;
    reference?: string;
    paymentId?: string;
    status: string;
    amount?: number;
    raw: Record<string, unknown>;
}
