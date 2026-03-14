import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import {
    IVirtualAccountParams,
    IVirtualAccountResult,
    IVerifyPaymentResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';
import { ProcessorHttpClient } from '@modules/processor/utils/processor-http.client';

@Injectable()
export class KorapayBankPaymentAdapter implements IBankTransferProcessor {
    private readonly logger = new Logger(KorapayBankPaymentAdapter.name);
    private readonly secretKey: string;
    private readonly merchantBearsCost: boolean;
    private readonly http: ProcessorHttpClient;

    constructor(private readonly configService: ConfigService) {
        this.secretKey =
            this.configService.get<string>('payment.korapay.secretKey') ?? '';
        this.merchantBearsCost =
            this.configService.get<boolean>(
                'payment.korapay.merchantBearsCost'
            ) ?? true;

        this.http = new ProcessorHttpClient(
            this.configService.get<string>('payment.korapay.baseUrl')!,
            { Authorization: `Bearer ${this.secretKey}` },
            this.logger
        );

        if (!this.secretKey) {
            this.logger.warn('Korapay secret key is not configured');
        }
    }

    async createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult> {
        this.logger.log(
            `Creating Korapay bank payment for reference: ${params.reference}`
        );

        if (!params.bankCode) {
            throw new Error('Bank code is required for Korapay pay-with-bank');
        }

        const data = await this.http.request(
            'POST',
            '/charges/pay-with-bank',
            {
                amount: params.amount / 100,
                currency: params.currency,
                reference: params.reference,
                bank_code: params.bankCode,
                redirect_url:
                    params.redirectUrl ??
                    `${this.configService.get<string>('app.publicUrl')}/payment/callback`,
                customer: {
                    name: params.customerName ?? 'Customer',
                    email: params.customerEmail,
                },
                narration: `Payment for ${params.reference}`,
                merchant_bears_cost:
                    params.merchantBearsCost ?? this.merchantBearsCost,
                notification_url: this.configService.get<string>(
                    'payment.korapay.webhookUrl'
                ),
            }
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            throw new Error(
                (data.message as string) ?? 'Failed to create bank payment'
            );
        }

        const authorization = result.authorization as Record<string, unknown>;
        const bankAccount = result.bank_account as Record<string, unknown>;
        const customer = result.customer as Record<string, unknown>;

        return {
            accountNumber: result.payment_reference as string,
            bankName: (bankAccount?.bank_name as string) ?? '',
            bankCode: params.bankCode,
            accountName: (customer?.name as string) ?? 'Customer',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            providerReference: result.transaction_reference as string,
            redirectUrl: authorization?.redirect_url as string,
        };
    }

    async verifyPayment(paymentId: string): Promise<IVerifyPaymentResult> {
        this.logger.log(`Verifying Korapay bank payment: ${paymentId}`);

        const data = await this.http.request('GET', `/charges/${paymentId}`);
        const result = data.data as Record<string, unknown>;

        if (!result) {
            return { status: 'pending', amount: 0 };
        }

        const statusStr = ((result.status as string) ?? '').toLowerCase();

        let status: 'success' | 'pending' | 'failed';
        if (statusStr === 'success') {
            status = 'success';
        } else if (statusStr === 'failed' || statusStr === 'expired') {
            status = 'failed';
        } else {
            status = 'pending';
        }

        const amount = parseFloat(String(result.amount ?? '0'));

        return {
            status,
            amount: Math.round(amount * 100),
            paidAt: status === 'success' ? new Date() : undefined,
            providerReference: result.reference as string,
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.log('Validating Korapay bank payment webhook');

        if (!this.secretKey) {
            throw new Error('Korapay secret key not configured');
        }

        const signature = headers['x-korapay-signature'] ?? '';
        const dataObj = payload.data as Record<string, unknown>;
        const expectedSignature = createHmac('sha256', this.secretKey)
            .update(JSON.stringify(dataObj))
            .digest('hex');

        if (signature !== expectedSignature) {
            this.logger.warn('Korapay bank payment webhook signature mismatch');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        const reference = (dataObj?.reference as string) ?? '';
        const statusStr = ((dataObj?.status as string) ?? '').toLowerCase();

        let status: string;
        if (statusStr === 'success') {
            status = 'success';
        } else if (statusStr === 'failed' || statusStr === 'expired') {
            status = 'failed';
        } else {
            status = 'pending';
        }

        return {
            eventType: (payload.event as string) ?? 'charge.success',
            reference,
            paymentId: dataObj?.payment_reference as string,
            status,
            amount: Math.round(
                parseFloat(String(dataObj?.amount ?? '0')) * 100
            ),
            raw: payload,
        };
    }
}
