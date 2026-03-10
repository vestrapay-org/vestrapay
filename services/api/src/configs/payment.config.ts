import { registerAs } from '@nestjs/config';

export interface IConfigPayment {
    fees: {
        cardPercentage: number;
        transferInflowPercentage: number;
        transferInflowCap: number;
        transferOutflowFlat: number;
    };
    mpgs: {
        baseUrl: string;
        merchantId: string;
        apiPassword: string;
        version: number;
    };
    alatpay: {
        baseUrl: string;
        secretKey: string;
        businessId: string;
        webhookUrl: string;
        webhookSecret: string;
    };
    korapay: {
        baseUrl: string;
        secretKey: string;
        encryptionKey: string;
        webhookUrl: string;
    };
    providers: {
        card: 'mpgs' | 'korapay';
        bankTransfer: 'alatpay' | 'korapay';
        ussd: 'alatpay';
    };
    transaction: {
        timeoutMinutes: number;
        referencePrefix: string;
    };
}

function validateProviderKeys(): void {
    const card = process.env.PAYMENT_CARD_PROVIDER ?? 'mpgs';
    const bank = process.env.PAYMENT_BANK_TRANSFER_PROVIDER ?? 'alatpay';

    if (card === 'korapay') {
        if (!process.env.KORAPAY_SECRET_KEY) {
            throw new Error('KORAPAY_SECRET_KEY required when PAYMENT_CARD_PROVIDER=korapay');
        }
        if (!process.env.KORAPAY_ENCRYPTION_KEY) {
            throw new Error('KORAPAY_ENCRYPTION_KEY required when PAYMENT_CARD_PROVIDER=korapay');
        }
    }

    if (card === 'mpgs') {
        if (!process.env.MPGS_MERCHANT_ID) {
            throw new Error('MPGS_MERCHANT_ID required when PAYMENT_CARD_PROVIDER=mpgs');
        }
        if (!process.env.MPGS_API_PASSWORD) {
            throw new Error('MPGS_API_PASSWORD required when PAYMENT_CARD_PROVIDER=mpgs');
        }
    }

    if (bank === 'korapay' && !process.env.KORAPAY_SECRET_KEY) {
        throw new Error('KORAPAY_SECRET_KEY required when PAYMENT_BANK_TRANSFER_PROVIDER=korapay');
    }

    if (bank === 'alatpay') {
        if (!process.env.ALATPAY_SECRET_KEY) {
            throw new Error('ALATPAY_SECRET_KEY required when PAYMENT_BANK_TRANSFER_PROVIDER=alatpay');
        }
        if (!process.env.ALATPAY_BUSINESS_ID) {
            throw new Error('ALATPAY_BUSINESS_ID required when PAYMENT_BANK_TRANSFER_PROVIDER=alatpay');
        }
    }
}

export default registerAs(
    'payment',
    (): IConfigPayment => {
    validateProviderKeys();
    return {
        fees: {
            cardPercentage: parseFloat(
                process.env.PAYMENT_FEE_CARD_PERCENTAGE ?? '4.3'
            ),
            transferInflowPercentage: parseFloat(
                process.env.PAYMENT_FEE_TRANSFER_INFLOW_PERCENTAGE ?? '1.4'
            ),
            transferInflowCap: parseInt(
                process.env.PAYMENT_FEE_TRANSFER_INFLOW_CAP ?? '200000'
            ), // 2000 NGN in kobo
            transferOutflowFlat: parseInt(
                process.env.PAYMENT_FEE_TRANSFER_OUTFLOW_FLAT ?? '5000'
            ), // 50 NGN in kobo
        },
        mpgs: {
            baseUrl:
                process.env.MPGS_BASE_URL ??
                'https://test-gateway.mastercard.com/api/rest/version/82',
            merchantId: process.env.MPGS_MERCHANT_ID ?? '',
            apiPassword: process.env.MPGS_API_PASSWORD ?? '',
            version: parseInt(process.env.MPGS_VERSION ?? '82'),
        },
        alatpay: {
            baseUrl:
                process.env.ALATPAY_BASE_URL ??
                'https://apibox.alatpay.ng',
            secretKey: process.env.ALATPAY_SECRET_KEY ?? '',
            businessId: process.env.ALATPAY_BUSINESS_ID ?? '',
            webhookUrl: process.env.ALATPAY_WEBHOOK_URL ?? '',
            webhookSecret: process.env.ALATPAY_WEBHOOK_SECRET ?? '',
        },
        korapay: {
            baseUrl:
                process.env.KORAPAY_BASE_URL ??
                'https://api.korapay.com/merchant/api/v1',
            secretKey: process.env.KORAPAY_SECRET_KEY ?? '',
            encryptionKey: process.env.KORAPAY_ENCRYPTION_KEY ?? '',
            webhookUrl: process.env.KORAPAY_WEBHOOK_URL ?? '',
        },
        providers: {
            card:
                (process.env.PAYMENT_CARD_PROVIDER as
                    | 'mpgs'
                    | 'korapay') ?? 'mpgs',
            bankTransfer:
                (process.env.PAYMENT_BANK_TRANSFER_PROVIDER as
                    | 'alatpay'
                    | 'korapay') ?? 'alatpay',
            ussd: 'alatpay' as const,
        },
        transaction: {
            timeoutMinutes: parseInt(
                process.env.PAYMENT_TRANSACTION_TIMEOUT_MINUTES ?? '30'
            ),
            referencePrefix:
                process.env.PAYMENT_REFERENCE_PREFIX ?? 'VPY',
        },
    };
});
