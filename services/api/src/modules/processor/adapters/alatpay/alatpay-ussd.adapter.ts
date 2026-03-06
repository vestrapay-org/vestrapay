import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { IUssdProcessor } from '@modules/processor/interfaces/ussd-processor.interface';
import {
    IUssdChargeParams,
    IUssdChargeResult,
    IUssdCompleteParams,
    IUssdCompleteResult,
    IUssdVerifyResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

@Injectable()
export class AlatpayUssdAdapter implements IUssdProcessor {
    private readonly logger = new Logger(AlatpayUssdAdapter.name);
    private readonly baseUrl: string;
    private readonly secretKey: string;
    private readonly businessId: string;
    private readonly webhookSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('payment.alatpay.baseUrl');
        this.secretKey = this.configService.get<string>(
            'payment.alatpay.secretKey'
        );
        this.businessId = this.configService.get<string>(
            'payment.alatpay.businessId'
        );
        this.webhookSecret = this.configService.get<string>(
            'payment.alatpay.webhookSecret'
        );
    }

    private async alatpayRequest(
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.baseUrl}${path}`;
        this.logger.debug(`AlatPay USSD ${method} ${url}`);

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
                `AlatPay USSD error ${response.status}: ${JSON.stringify(data)}`
            );
        }

        this.logger.debug(`AlatPay USSD response: ${JSON.stringify(data)}`);
        return data;
    }

    async initiateCharge(
        params: IUssdChargeParams
    ): Promise<IUssdChargeResult> {
        const data = await this.alatpayRequest(
            'POST',
            '/alatpay-phone-number/api/v1/phone-number-payment/initialize',
            {
                amount: String(params.amount / 100), // kobo → naira, as string per API
                currency: params.currency,
                customer: {
                    email: params.email,
                    phone: params.phoneNumber,
                    firstName: '',
                    lastName: '',
                },
                phonenumber: params.phoneNumber,
                businessId: this.businessId,
            }
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            this.logger.error('AlatPay initiateCharge: no data in response');
            throw new Error(
                (data.message as string) ?? 'Failed to initiate phone payment'
            );
        }

        return {
            ussdCode: (result.phoneNumber as string) ?? params.phoneNumber,
            processorReference: result.transactionId as string,
            status: 'pending',
        };
    }

    async completeCharge(
        params: IUssdCompleteParams
    ): Promise<IUssdCompleteResult> {
        const data = await this.alatpayRequest(
            'POST',
            '/alatpay-phone-number/api/v1/phone-number-payment/complete-phonenumber-payment',
            {
                phonenumber: params.phoneNumber,
                amount: String(params.amount / 100), // kobo → naira
                businessid: this.businessId,
                currency: params.currency,
                transactionId: params.transactionId,
            }
        );

        const result = data.data as Record<string, unknown>;
        const statusStr = (
            (result?.status as string) ?? ''
        ).toLowerCase();

        let status: 'success' | 'pending' | 'failed';
        if (
            statusStr === 'successful' ||
            statusStr === 'success'
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
            transactionId: params.transactionId,
            amount: params.amount,
        };
    }

    async verifyCharge(reference: string): Promise<IUssdVerifyResult> {
        // Use bank transfer transaction endpoint for verification
        const data = await this.alatpayRequest(
            'GET',
            `/bank-transfer/api/v1/bankTransfer/transactions/${reference}`
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
            statusStr === 'success'
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
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.debug(
            `AlatPay USSD webhook received: ${JSON.stringify(payload)}`
        );

        if (this.webhookSecret) {
            const signature = headers['x-alatpay-signature'] ?? headers['x-webhook-signature'] ?? '';
            const expectedSignature = createHmac('sha512', this.webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSignature) {
                this.logger.warn('AlatPay USSD webhook signature mismatch');
                throw new UnauthorizedException('Invalid webhook signature');
            }
        }

        const data = payload.data as Record<string, unknown> | undefined;

        const reference = (data?.orderId as string) ?? '';
        const statusStr = (
            (data?.status as string) ?? ''
        ).toLowerCase();

        let status: string;
        if (
            statusStr === 'successful' ||
            statusStr === 'success'
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
            eventType: 'charge.success',
            reference,
            paymentId: data?.id as string,
            status,
            amount: ((data?.amount as number) ?? 0) * 100,
            raw: payload,
        };
    }
}
