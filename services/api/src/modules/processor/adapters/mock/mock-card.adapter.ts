import { Injectable, Logger } from '@nestjs/common';
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
import { randomUUID } from 'crypto';

const MOCK_SUCCESS_CARD = '5123450000000008';
const MOCK_DECLINE_CARD = '5123450000000016';
const MOCK_NO_3DS_CARD = '4508750015741019';

@Injectable()
export class MockCardAdapter implements ICardProcessor {
    private readonly logger = new Logger(MockCardAdapter.name);

    private readonly sessions = new Map<
        string,
        { card?: ICardData; orderId?: string }
    >();

    async createSession(): Promise<ICreateSessionResult> {
        const sessionId = `SESSION${randomUUID().replace(/-/g, '').slice(0, 24).toUpperCase()}`;
        this.sessions.set(sessionId, {});
        this.logger.debug(`Mock: Created session ${sessionId}`);

        return { sessionId };
    }

    async updateSessionWithCard(
        sessionId: string,
        card: ICardData
    ): Promise<IUpdateSessionResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            this.logger.warn(`Mock: Session ${sessionId} not found`);
            return { success: false };
        }

        session.card = card;
        this.logger.debug(
            `Mock: Updated session ${sessionId} with card ending ${card.number.slice(-4)}`
        );

        return { success: true };
    }

    async initiate3dsAuth(params: I3dsInitParams): Promise<I3dsInitResult> {
        const session = this.sessions.get(params.sessionId);
        const cardNumber = session?.card?.number ?? '';

        if (cardNumber === MOCK_NO_3DS_CARD) {
            this.logger.debug('Mock: No 3DS required for this card');
            return {
                version: 'NONE',
                gatewayRecommendation: 'PROCEED',
            };
        }

        if (cardNumber === MOCK_DECLINE_CARD) {
            return {
                version: 'NONE',
                gatewayRecommendation: 'DO_NOT_PROCEED',
            };
        }

        this.logger.debug('Mock: 3DS2 required, returning redirect HTML');
        return {
            version: '3DS2',
            redirectHtml: this.generate3dsHtml(params.orderId),
            gatewayRecommendation: 'PROCEED',
        };
    }

    async authenticatePayer(params: I3dsAuthParams): Promise<I3dsAuthResult> {
        this.logger.debug(
            `Mock: Authenticating payer for order ${params.orderId}`
        );

        return {
            gatewayRecommendation: 'PROCEED',
            authenticationStatus: 'Y',
            transactionId: params.transactionId,
        };
    }

    async pay(params: IPayParams): Promise<IPayResult> {
        const session = this.sessions.get(params.sessionId);
        const cardNumber = session?.card?.number ?? '';

        if (cardNumber === MOCK_DECLINE_CARD) {
            this.logger.debug('Mock: Payment declined');
            return {
                status: 'declined',
                gatewayCode: 'DECLINED',
                transactionReference: `MOCK_TXN_${Date.now()}`,
                processorResponse: {
                    mock: true,
                    reason: 'Card declined by issuer',
                },
            };
        }

        this.logger.debug(
            `Mock: Payment successful for ${params.amount} ${params.currency}`
        );

        // Clean up session
        this.sessions.delete(params.sessionId);

        return {
            status: 'success',
            acquirerCode: '00',
            gatewayCode: 'APPROVED',
            transactionReference: `MOCK_TXN_${Date.now()}`,
            processorResponse: {
                mock: true,
                orderId: params.orderId,
            },
        };
    }

    private generate3dsHtml(orderId: string): string {
        return `
            <div id="mock-3ds" style="padding:20px;text-align:center;font-family:sans-serif;">
                <h3>Mock 3DS Authentication</h3>
                <p>This is a simulated 3DS challenge page for order: ${orderId}</p>
                <p>In production, the customer's bank page would appear here.</p>
                <button onclick="window.parent.postMessage({type:'3ds-complete',orderId:'${orderId}'},'*')">
                    Complete Authentication
                </button>
            </div>
        `.trim();
    }
}
