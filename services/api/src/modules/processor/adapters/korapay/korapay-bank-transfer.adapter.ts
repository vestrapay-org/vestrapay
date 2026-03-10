
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
export class KorapayBankTransferAdapter implements IBankTransferProcessor {
    private readonly logger = new Logger(KorapayBankTransferAdapter.name);
    private readonly secretKey: string;
    private readonly webhookUrl: string;
    private readonly http: ProcessorHttpClient;

    constructor(private readonly configService: ConfigService) {
        this.secretKey = this.configService.get<string>(
            'payment.korapay.secretKey'
        )!;
        this.webhookUrl = this.configService.get<string>(
            'payment.korapay.webhookUrl'
        )!;

        this.http = new ProcessorHttpClient(
            this.configService.get<string>('payment.korapay.baseUrl')!,
            { Authorization: `Bearer ${this.secretKey}` },
            this.logger
        );
    }

    async createVirtualAccount(
        params: IVirtualAccountParams
    ): Promise<IVirtualAccountResult> {
        const data = await this.http.request(
            'POST',
            '/charges/bank-transfer',
            {
                reference: params.reference,
                amount: params.amount / 100,
                currency: params.currency,
                narration: 'VestraPay Payment',
                notification_url: this.webhookUrl || undefined,
                customer: {
                    email: params.customerEmail,
                    name: params.customerName || 'Customer',
                },
            }
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            throw new Error(
                (data.message as string) ??
                    'Failed to create bank transfer charge'
            );
        }

        const bankAccount = result.bank_account as Record<string, unknown>;

        if (!bankAccount) {
            throw new Error('Failed to get bank account details from Korapay');
        }

        const expiresAt = bankAccount.expiry_date_in_utc
            ? new Date(bankAccount.expiry_date_in_utc as string)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        return {
            accountNumber: bankAccount.account_number as string,
            bankName: bankAccount.bank_name as string,
            bankCode: bankAccount.bank_code as string,
            accountName: bankAccount.account_name as string,
            expiresAt,
            providerReference:
                (result.payment_reference as string) ??
                (result.reference as string),
        };
    }

    async verifyPayment(paymentId: string): Promise<IVerifyPaymentResult> {
        const data = await this.http.request(
            'GET',
            `/charges/${paymentId}`
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            return { status: 'pending', amount: 0 };
        }

        const statusStr = (
            (result.status as string) ?? ''
        ).toLowerCase();

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
        if (!this.secretKey) {
            throw new Error('Korapay secret key not configured');
        }

        // Korapay signs only the data object with HMAC SHA256
        const signature = headers['x-korapay-signature'] ?? '';
        const dataObj = payload.data as Record<string, unknown>;
        const expectedSignature = createHmac('sha256', this.secretKey)
            .update(JSON.stringify(dataObj))
            .digest('hex');

        if (signature !== expectedSignature) {
            this.logger.warn('Korapay webhook signature mismatch');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        const reference = (dataObj?.reference as string) ?? '';
        const statusStr = (
            (dataObj?.status as string) ?? ''
        ).toLowerCase();

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
