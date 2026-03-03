import { Injectable, Logger } from '@nestjs/common';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import {
    IAccountResolveResult,
    IBankInfo,
    IVerifyPaymentResult,
    IVirtualAccountParams,
    IVirtualAccountResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

@Injectable()
export class MockBankTransferAdapter implements IBankTransferProcessor {
    private readonly logger = new Logger(MockBankTransferAdapter.name);

    private readonly mockPayments = new Map<
        string,
        { status: string; amount: number }
    >();

    async createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult> {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);

        this.mockPayments.set(params.reference, {
            status: 'pending',
            amount: params.amount,
        });

        this.logger.debug(
            `Mock: Created virtual account for ${params.amount} ${params.currency}`
        );

        return {
            accountNumber: '0123456789',
            bankName: 'Providus Bank',
            bankCode: '101',
            accountName: `VPY/${params.reference}`,
            expiresAt,
            providerReference: `MOCK_VA_${Date.now()}`,
        };
    }

    async verifyPayment(paymentId: string): Promise<IVerifyPaymentResult> {
        const payment = this.mockPayments.get(paymentId);

        if (!payment) {
            return { status: 'pending', amount: 0 };
        }

        // Simulate: after first verify call, mark as success
        if (payment.status === 'pending') {
            payment.status = 'success';
            return { status: 'pending', amount: payment.amount };
        }

        return {
            status: 'success',
            amount: payment.amount,
            paidAt: new Date(),
            providerReference: `MOCK_PAY_${Date.now()}`,
        };
    }

    async listBanks(): Promise<IBankInfo[]> {
        return [
            {
                name: 'Access Bank',
                code: '044',
                slug: 'access-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'First Bank of Nigeria',
                code: '011',
                slug: 'first-bank-of-nigeria',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Guaranty Trust Bank',
                code: '058',
                slug: 'guaranty-trust-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'United Bank for Africa',
                code: '033',
                slug: 'united-bank-for-africa',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Zenith Bank',
                code: '057',
                slug: 'zenith-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Stanbic IBTC Bank',
                code: '221',
                slug: 'stanbic-ibtc-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Fidelity Bank',
                code: '070',
                slug: 'fidelity-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Union Bank of Nigeria',
                code: '032',
                slug: 'union-bank-of-nigeria',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Sterling Bank',
                code: '232',
                slug: 'sterling-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Wema Bank',
                code: '035',
                slug: 'wema-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Providus Bank',
                code: '101',
                slug: 'providus-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Polaris Bank',
                code: '076',
                slug: 'polaris-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Keystone Bank',
                code: '082',
                slug: 'keystone-bank',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'Ecobank Nigeria',
                code: '050',
                slug: 'ecobank-nigeria',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
            {
                name: 'FCMB',
                code: '214',
                slug: 'fcmb',
                country: 'NG',
                currency: 'NGN',
                type: 'nuban',
            },
        ];
    }

    async resolveAccount(
        bankCode: string,
        accountNumber: string
    ): Promise<IAccountResolveResult> {
        this.logger.debug(
            `Mock: Resolving account ${accountNumber} at bank ${bankCode}`
        );

        return {
            accountName: 'MOCK ACCOUNT NAME',
            accountNumber,
            bankCode,
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        _headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.debug('Mock: Validating webhook');

        const reference =
            (payload.reference as string) ??
            (payload.payment_reference as string) ??
            '';

        // Update mock payment status
        const payment = this.mockPayments.get(reference);
        if (payment) {
            payment.status = 'success';
        }

        return {
            eventType: 'payin.received',
            reference,
            status: 'success',
            amount: payment?.amount ?? 0,
            raw: payload,
        };
    }
}
