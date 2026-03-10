import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import {
    IVerifyPaymentResult,
    IVirtualAccountParams,
    IVirtualAccountResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';
import { ProcessorHttpClient } from '@modules/processor/utils/processor-http.client';

@Injectable()
export class AlatpayBankTransferAdapter implements IBankTransferProcessor {
    private readonly logger = new Logger(AlatpayBankTransferAdapter.name);
    private readonly businessId: string;
    private readonly webhookSecret: string;
    private readonly http: ProcessorHttpClient;

    constructor(private readonly configService: ConfigService) {
        this.businessId = this.configService.get<string>(
            'payment.alatpay.businessId'
        )!;
        this.webhookSecret = this.configService.get<string>(
            'payment.alatpay.webhookSecret'
        )!;

        this.http = new ProcessorHttpClient(
            this.configService.get<string>('payment.alatpay.baseUrl')!,
            {
                'Ocp-Apim-Subscription-Key': this.configService.get<string>(
                    'payment.alatpay.secretKey'
                )!,
            },
            this.logger
        );
    }

    async createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult> {
        const [firstName, ...lastParts] = (
            params.customerName ?? ''
        ).split(' ');

        const data = await this.http.request(
            'POST',
            '/bank-transfer/api/v1/bankTransfer/virtualAccount',
            {
                businessId: this.businessId,
                amount: params.amount / 100,
                currency: params.currency,
                orderId: params.reference,
                description: 'VestraPay Payment',
                customer: {
                    email: params.customerEmail,
                    phone: '',
                    firstName: firstName || 'Customer',
                    lastName: lastParts.join(' ') || 'Customer',
                    metadata: '',
                },
            }
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            throw new Error(
                (data.message as string) ??
                    'Failed to create virtual account'
            );
        }

        const expiresAt = result.expiredAt
            ? new Date(result.expiredAt as string)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        return {
            accountNumber: result.virtualBankAccountNumber as string,
            bankName: 'Wema Bank',
            bankCode: (result.virtualBankCode as string) ?? '035',
            accountName: `VPY/${params.reference}`,
            expiresAt,
            providerReference: result.transactionId as string,
        };
    }

    async verifyPayment(paymentId: string): Promise<IVerifyPaymentResult> {
        const data = await this.http.request(
            'GET',
            `/bank-transfer/api/v1/bankTransfer/transactions/${paymentId}`
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            return { status: 'pending', amount: 0 };
        }

        const statusStr = (
            (result.status as string) ?? ''
        ).toLowerCase();

        let status: 'success' | 'pending' | 'failed';
        if (
            statusStr === 'successful' ||
            statusStr === 'success' ||
            statusStr === 'true'
        ) {
            status = 'success';
        } else if (
            statusStr === 'failed' ||
            statusStr === 'declined'
        ) {
            status = 'failed';
        } else {
            status = 'pending';
        }

        return {
            status,
            amount: ((result.amount as number) ?? 0) * 100,
            paidAt: status === 'success' ? new Date() : undefined,
            providerReference: result.id as string,
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        if (!this.webhookSecret) {
            throw new Error('AlatPay webhook secret not configured');
        }

        const signature = headers['x-alatpay-signature'] ?? headers['x-webhook-signature'] ?? '';
        const expectedSignature = createHmac('sha512', this.webhookSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== expectedSignature) {
            this.logger.warn('AlatPay webhook signature mismatch');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        const data = payload.data as Record<string, unknown> | undefined;
        const reference = (data?.orderId as string) ?? '';
        const statusStr = (
            (data?.status as string) ?? ''
        ).toLowerCase();

        let status: string;
        if (
            statusStr === 'successful' ||
            statusStr === 'success' ||
            statusStr === 'true'
        ) {
            status = 'success';
        } else if (
            statusStr === 'failed' ||
            statusStr === 'declined'
        ) {
            status = 'failed';
        } else {
            status = 'pending';
        }

        return {
            eventType: 'payin.received',
            reference,
            paymentId: data?.id as string,
            status,
            amount: ((data?.amount as number) ?? 0) * 100,
            raw: payload,
        };
    }
}
