import { Injectable, Logger } from '@nestjs/common';
import { IUssdProcessor } from '@modules/processor/interfaces/ussd-processor.interface';
import {
    IUssdChargeParams,
    IUssdChargeResult,
    IUssdVerifyResult,
    IWebhookEvent,
} from '@modules/processor/interfaces/processor-response.interface';

@Injectable()
export class MockUssdAdapter implements IUssdProcessor {
    private readonly logger = new Logger(MockUssdAdapter.name);

    private readonly mockCharges = new Map<
        string,
        { status: string; amount: number }
    >();

    async initiateCharge(params: IUssdChargeParams): Promise<IUssdChargeResult> {
        const processorReference = `MOCK_USSD_${Date.now()}`;

        this.mockCharges.set(params.reference, {
            status: 'pending',
            amount: params.amount,
        });

        this.logger.debug(
            `Mock: Initiated USSD charge for ${params.amount} ${params.currency}`
        );

        return {
            ussdCode: `*737*000*${Math.floor(1000 + Math.random() * 9000)}#`,
            processorReference,
            status: 'pending',
        };
    }

    async verifyCharge(reference: string): Promise<IUssdVerifyResult> {
        const charge = this.mockCharges.get(reference);

        if (!charge) {
            return { status: 'pending', amount: 0 };
        }

        // Simulate: after first verify, mark as success
        if (charge.status === 'pending') {
            charge.status = 'success';
            return { status: 'pending', amount: charge.amount };
        }

        return {
            status: 'success',
            amount: charge.amount,
            paidAt: new Date(),
        };
    }

    async validateWebhook(
        payload: Record<string, unknown>,
        _headers: Record<string, string>
    ): Promise<IWebhookEvent> {
        this.logger.debug('Mock: Validating USSD webhook');

        const reference = (payload.reference as string) ?? '';

        const charge = this.mockCharges.get(reference);
        if (charge) {
            charge.status = 'success';
        }

        return {
            eventType: 'charge.success',
            reference,
            status: 'success',
            amount: charge?.amount ?? 0,
            raw: payload,
        };
    }
}
