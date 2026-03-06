import { Injectable, Logger } from '@nestjs/common';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import {
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

    async validateWebhook(
        payload: Record<string, unknown>,
        _headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.debug('Mock: Validating webhook');

        const reference =
            (payload.reference as string) ??
            (payload.payment_reference as string) ??
            '';

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
