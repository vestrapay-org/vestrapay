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

@Injectable()
export class MpgsCardAdapter implements ICardProcessor {
    private readonly logger = new Logger(MpgsCardAdapter.name);
    private readonly baseUrl: string;
    private readonly merchantId: string;
    private readonly authHeader: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('payment.mpgs.baseUrl');
        this.merchantId = this.configService.get<string>(
            'payment.mpgs.merchantId'
        );
        const apiPassword = this.configService.get<string>(
            'payment.mpgs.apiPassword'
        );

        // Basic Auth: merchant.{merchantId}:{apiPassword}
        const credentials = `merchant.${this.merchantId}:${apiPassword}`;
        this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    }

    private get merchantUrl(): string {
        return `${this.baseUrl}/merchant/${this.merchantId}`;
    }

    private async mpgsRequest(
        method: string,
        path: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.merchantUrl}${path}`;
        this.logger.debug(`MPGS ${method} ${url}`);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: this.authHeader,
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
            this.logger.error(
                `MPGS error ${response.status}: ${JSON.stringify(data)}`
            );
        }

        this.logger.debug(`MPGS response: ${JSON.stringify(data)}`);
        return data;
    }

    async createSession(): Promise<ICreateSessionResult> {
        const data = await this.mpgsRequest('POST', '/session');

        const session = data.session as Record<string, unknown>;
        return {
            sessionId: session?.id as string,
        };
    }

    async updateSessionWithCard(
        sessionId: string,
        card: ICardData
    ): Promise<IUpdateSessionResult> {
        const cardData: Record<string, unknown> = {
            number: card.number,
            securityCode: card.cvv,
            expiry: {
                month: card.expiryMonth,
                year: card.expiryYear,
            },
        };

        const data = await this.mpgsRequest('PUT', `/session/${sessionId}`, {
            sourceOfFunds: {
                provided: {
                    card: cardData,
                },
            },
        });

        const session = data.session as Record<string, unknown>;
        return {
            success: session?.updateStatus === 'SUCCESS',
        };
    }

    async initiate3dsAuth(params: I3dsInitParams): Promise<I3dsInitResult> {
        const data = await this.mpgsRequest(
            'PUT',
            `/order/${params.orderId}/transaction/${params.transactionId}`,
            {
                apiOperation: 'INITIATE_AUTHENTICATION',
                authentication: {
                    acceptVersions: '3DS1,3DS2',
                    channel: 'PAYER_BROWSER',
                    purpose: 'PAYMENT_TRANSACTION',
                },
                correlationId: params.orderId,
                order: {
                    reference: params.orderReference ?? params.orderId,
                    currency: params.currency,
                },
                session: {
                    id: params.sessionId,
                },
            }
        );

        const authentication = data.authentication as Record<string, unknown>;
        const response = data.response as Record<string, unknown>;
        const redirect = authentication?.redirect as Record<string, unknown>;

        return {
            version:
                (authentication?.version as '3DS1' | '3DS2' | 'NONE') ??
                'NONE',
            redirectHtml: redirect?.html as string | undefined,
            gatewayRecommendation:
                (response?.gatewayRecommendation as
                    | 'PROCEED'
                    | 'DO_NOT_PROCEED') ?? 'DO_NOT_PROCEED',
        };
    }

    async authenticatePayer(params: I3dsAuthParams): Promise<I3dsAuthResult> {
        const body: Record<string, unknown> = {
            apiOperation: 'AUTHENTICATE_PAYER',
            authentication: {
                redirectResponseUrl: params.redirectResponseUrl,
            },
            correlationId: params.orderId,
            order: {
                amount: params.amount.toFixed(2),
                currency: params.currency,
            },
            session: {
                id: params.sessionId,
            },
        };

        if (params.deviceInfo) {
            body.device = {
                browser: params.deviceInfo.browser ?? 'MOZILLA',
                ipAddress: params.deviceInfo.ipAddress ?? '127.0.0.1',
                browserDetails: {
                    '3DSecureChallengeWindowSize': 'FULL_SCREEN',
                    acceptHeaders: 'application/json',
                    colorDepth:
                        params.deviceInfo.browserDetails?.colorDepth ?? 24,
                    javaEnabled:
                        params.deviceInfo.browserDetails?.javaEnabled ?? true,
                    language:
                        params.deviceInfo.browserDetails?.language ?? 'en-US',
                    screenHeight:
                        params.deviceInfo.browserDetails?.screenHeight ?? 640,
                    screenWidth:
                        params.deviceInfo.browserDetails?.screenWidth ?? 480,
                    timeZone:
                        params.deviceInfo.browserDetails?.timeZone ?? 60,
                },
            };
        }

        const data = await this.mpgsRequest(
            'PUT',
            `/order/${params.orderId}/transaction/${params.transactionId}`,
            body
        );

        const authentication = data.authentication as Record<string, unknown>;
        const response = data.response as Record<string, unknown>;
        const redirect = authentication?.redirect as Record<string, unknown>;
        const transaction = data.transaction as Record<string, unknown>;

        return {
            gatewayRecommendation:
                (response?.gatewayRecommendation as
                    | 'PROCEED'
                    | 'DO_NOT_PROCEED') ?? 'DO_NOT_PROCEED',
            authenticationHtml: redirect?.html as string | undefined,
            authenticationStatus: authentication?.['3ds2'] as
                | string
                | undefined,
            transactionId: (transaction?.id as string) ?? params.transactionId,
        };
    }

    async pay(params: IPayParams): Promise<IPayResult> {
        const body: Record<string, unknown> = {
            apiOperation: 'PAY',
            order: {
                amount: params.amount.toFixed(2),
                currency: params.currency,
                reference: params.orderReference ?? params.orderId,
            },
            sourceOfFunds: {
                type: 'CARD',
            },
            transaction: {
                reference: `TXN_${params.orderId}`,
            },
        };

        // Always include session for card data
        if (params.sessionId) {
            body.session = { id: params.sessionId };
        }

        // Include authentication if 3DS was done
        if (params.authTransactionId) {
            body.authentication = {
                transactionId: params.authTransactionId,
            };
        }

        const payTxnId = `PAY_${Date.now()}`;
        const data = await this.mpgsRequest(
            'PUT',
            `/order/${params.orderId}/transaction/${payTxnId}`,
            body
        );

        const response = data.response as Record<string, unknown>;
        const transaction = data.transaction as Record<string, unknown>;
        const gatewayCode = response?.gatewayCode as string;

        if (
            gatewayCode === 'APPROVED' ||
            gatewayCode === 'APPROVED_AUTO' ||
            data.result === 'SUCCESS'
        ) {
            return {
                status: 'success',
                acquirerCode: (response?.acquirerCode as string) ?? '',
                gatewayCode,
                transactionReference: transaction?.id as string,
                processorResponse: data,
            };
        }

        return {
            status: gatewayCode === 'DECLINED' ? 'declined' : 'failed',
            gatewayCode,
            transactionReference: transaction?.id as string,
            processorResponse: data,
        };
    }
}
