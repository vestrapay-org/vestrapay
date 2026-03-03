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
    korapay: {
        baseUrl: string;
        secretKey: string;
        encryptionKey: string;
    };
    anchor: {
        baseUrl: string;
        apiKey: string;
    };
    transaction: {
        timeoutMinutes: number;
        referencePrefix: string;
    };
}

export default registerAs(
    'payment',
    (): IConfigPayment => ({
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
        korapay: {
            baseUrl:
                process.env.KORAPAY_BASE_URL ??
                'https://api.korapay.com/merchant/api/v1',
            secretKey: process.env.KORAPAY_SECRET_KEY ?? '',
            encryptionKey: process.env.KORAPAY_ENCRYPTION_KEY ?? '',
        },
        anchor: {
            baseUrl:
                process.env.ANCHOR_BASE_URL ??
                'https://api.sandbox.getanchor.co/api/v1',
            apiKey: process.env.ANCHOR_API_KEY ?? '',
        },
        transaction: {
            timeoutMinutes: parseInt(
                process.env.PAYMENT_TRANSACTION_TIMEOUT_MINUTES ?? '30'
            ),
            referencePrefix:
                process.env.PAYMENT_REFERENCE_PREFIX ?? 'VPY',
        },
    })
);
