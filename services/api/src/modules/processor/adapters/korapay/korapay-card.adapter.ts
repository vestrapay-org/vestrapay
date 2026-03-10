import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ICardProcessor } from '@modules/processor/interfaces/card-processor.interface';
import {
    I3dsAuthParams,
    I3dsAuthResult,
    I3dsInitParams,
    I3dsInitResult,
    ICardData,
    ICreateSessionResult,
    IPayParams,
    IPayResult,
    IUpdateSessionResult,
} from '@modules/processor/interfaces/processor-response.interface';
import { ProcessorHttpClient } from '@modules/processor/utils/processor-http.client';

/**
 * Korapay card adapter. Currently a partial implementation because ICardProcessor
 * assumes MPGS-style sessions (create session → put card → auth → pay).
 * Korapay encrypts card data directly into the charge request with no session concept.
 *
 * To fully support Korapay cards, I3dsAuthParams needs an optional `card` field
 * so the adapter can access card data at charge time. Until then, authenticatePayer
 * returns DO_NOT_PROCEED and the service falls back to direct pay or rejects.
 */
@Injectable()
export class KorapayCardAdapter implements ICardProcessor {
    private readonly logger = new Logger(KorapayCardAdapter.name);
    private readonly http: ProcessorHttpClient;

    constructor(private readonly configService: ConfigService) {
        this.http = new ProcessorHttpClient(
            this.configService.get<string>('payment.korapay.baseUrl')!,
            {
                Authorization: `Bearer ${this.configService.get<string>('payment.korapay.secretKey')}`,
            },
            this.logger
        );
    }

    async createSession(): Promise<ICreateSessionResult> {
        // Korapay has no sessions — return a generated reference
        const sessionId = `kp_${Date.now().toString(36)}`;
        return { sessionId };
    }

    async updateSessionWithCard(
        _sessionId: string,
        _card: ICardData
    ): Promise<IUpdateSessionResult> {
        // No-op: Korapay doesn't use sessions. Card data is needed at charge time
        // but the current interface doesn't carry it through to authenticatePayer.
        return { success: true };
    }

    async initiate3dsAuth(_params: I3dsInitParams): Promise<I3dsInitResult> {
        // Defer actual charge to authenticatePayer where we have amount info
        return {
            version: '3DS2',
            gatewayRecommendation: 'PROCEED',
        };
    }

    async authenticatePayer(
        params: I3dsAuthParams
    ): Promise<I3dsAuthResult> {
        // Interface limitation: card data isn't available here.
        // TODO: Add optional `card` field to I3dsAuthParams to support Korapay.
        this.logger.warn(
            'Korapay card: authenticatePayer needs card data via I3dsAuthParams.card'
        );
        return {
            gatewayRecommendation: 'DO_NOT_PROCEED',
            transactionId: params.transactionId,
        };
    }

    async pay(params: IPayParams): Promise<IPayResult> {
        const data = await this.http.request(
            'GET',
            `/charges/${params.orderId}`
        );

        const result = data.data as Record<string, unknown>;

        if (!result) {
            return {
                status: 'failed',
                gatewayCode: 'NO_RESPONSE',
                transactionReference: params.orderId,
                processorResponse: data,
            };
        }

        const status = ((result.status as string) ?? '').toLowerCase();

        if (status === 'success') {
            return {
                status: 'success',
                gatewayCode: 'APPROVED',
                transactionReference:
                    (result.payment_reference as string) ?? params.orderId,
                processorResponse: data,
            };
        }

        return {
            status: status === 'failed' ? 'failed' : 'declined',
            gatewayCode: (result.status as string) ?? 'UNKNOWN',
            transactionReference: params.orderId,
            processorResponse: data,
        };
    }
}
