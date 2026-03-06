import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import {
    IVerifyPaymentResult,
    IVirtualAccountParams,
    IVirtualAccountResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

@Injectable()
export class AlatpayBankTransferAdapter implements IBankTransferProcessor {
    private readonly logger = new Logger(AlatpayBankTransferAdapter.name);
    private readonly baseUrl: string;
    private readonly secretKey: string;
    private readonly businessId: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('payment.alatpay.baseUrl');
        this.secretKey = this.configService.get<string>(
            'payment.alatpay.secretKey'
        );
        this.businessId = this.configService.get<string>(
            'payment.alatpay.businessId'
        );
    }

    private async alatpayRequest(
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.baseUrl}${path}`;
        this.logger.debug(`AlatPay ${method} ${url}`);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': this.secretKey,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
            this.logger.error(
                `AlatPay error ${response.status}: ${JSON.stringify(data)}`
            );
        }

        this.logger.debug(`AlatPay response: ${JSON.stringify(data)}`);
        return data;
    }

    async createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult> {
        const [firstName, ...lastParts] = (
            params.customerName ?? ''
        ).split(' ');

        const data = await this.alatpayRequest(
            'POST',
            '/bank-transfer/api/v1/bankTransfer/virtualAccount',
            {
                businessId: this.businessId,
                amount: params.amount / 100, // kobo → naira
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
            this.logger.error('AlatPay createVirtualAccount: no data in response');
            throw new Error(
                (data.message as string) ??
                    'Failed to create virtual account'
            );
        }

        const expiresAt = result.expiredAt
            ? new Date(result.expiredAt as string)
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours fallback

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
        const data = await this.alatpayRequest(
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
            amount: ((result.amount as number) ?? 0) * 100, // naira → kobo
            paidAt: status === 'success' ? new Date() : undefined,
            providerReference: result.id as string,
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        _headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.debug(
            `AlatPay webhook received: ${JSON.stringify(payload)}`
        );

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
            amount: ((data?.amount as number) ?? 0) * 100, // naira → kobo
            raw: payload,
        };
    }
}
