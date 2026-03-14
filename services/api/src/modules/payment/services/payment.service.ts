import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumTransactionChannel, EnumTransactionStatus } from '@prisma/client';
import { PaymentRepository } from '@modules/payment/repositories/payment.repository';
import { PaymentUtil } from '@modules/payment/utils/payment.util';
import {
    ALATPAY_BANK_TRANSFER_PROCESSOR,
    BANK_TRANSFER_PROCESSOR,
    BANK_PAYMENT_PROCESSOR,
    CARD_PROCESSOR,
    KORAPAY_BANK_TRANSFER_PROCESSOR,
    USSD_PROCESSOR,
} from '@modules/processor/constants/processor.constant';
import { ICardProcessor } from '@modules/processor/interfaces/card-processor.interface';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import { IUssdProcessor } from '@modules/processor/interfaces/ussd-processor.interface';
import { EnumPaymentStatusCodeError } from '@modules/payment/enums/payment.status-code.enum';
import { PaymentChargeCardRequestDto } from '@modules/payment/dtos/request/payment.charge-card.request.dto';
import { PaymentChargeBankTransferRequestDto } from '@modules/payment/dtos/request/payment.charge-bank-transfer.request.dto';
import { PaymentChargeBankPaymentRequestDto } from '@modules/payment/dtos/request/payment.charge-bank-payment.request.dto';
import { PaymentChargeUssdRequestDto } from '@modules/payment/dtos/request/payment.charge-ussd.request.dto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly redirectResponseUrl: string;
    private readonly cardProviderName: string;
    private readonly bankTransferProviderName: string;
    private readonly ussdProviderName: string;

    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentUtil: PaymentUtil,
        private readonly configService: ConfigService,
        @Inject(CARD_PROCESSOR)
        private readonly cardProcessor: ICardProcessor,
        @Inject(BANK_TRANSFER_PROCESSOR)
        private readonly bankTransferProcessor: IBankTransferProcessor,
        @Inject(ALATPAY_BANK_TRANSFER_PROCESSOR)
        private readonly alatpayBankTransfer: IBankTransferProcessor,
        @Inject(KORAPAY_BANK_TRANSFER_PROCESSOR)
        private readonly korapayBankTransfer: IBankTransferProcessor,
        @Inject(BANK_PAYMENT_PROCESSOR)
        private readonly bankPaymentProcessor: IBankTransferProcessor,
        @Inject(USSD_PROCESSOR)
        private readonly ussdProcessor: IUssdProcessor
    ) {
        const baseUrl = (
            process.env.APP_PUBLIC_URL ??
            `http://localhost:${this.configService.get<number>('app.http.port')}`
        ).replace(/\/+$/, '');
        this.redirectResponseUrl = `${baseUrl}/api/v1/public/payment/3ds-callback`;
        this.cardProviderName =
            this.configService.get<string>('payment.providers.card') ?? 'mpgs';
        this.bankTransferProviderName =
            this.configService.get<string>('payment.providers.bankTransfer') ??
            'alatpay';
        this.ussdProviderName =
            this.configService.get<string>('payment.providers.ussd') ??
            'alatpay';
    }

    async chargeCard(
        dto: PaymentChargeCardRequestDto,
        ipAddress?: string
    ): Promise<{
        status: string;
        reference: string;
        threeDsHtml?: string;
    }> {
        // Find default merchant
        const merchant = await this.paymentRepository.findDefaultMerchant();
        if (!merchant) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.merchantNotFound,
                message: 'payment.error.merchantNotFound',
            });
        }

        // Create transaction record in DB
        const reference = this.paymentUtil.generateReference();
        const currency = dto.currency ?? 'NGN';
        const transaction = await this.paymentRepository.createTransaction({
            merchantId: merchant.id,
            reference,
            amount: dto.amount,
            currency,
            email: dto.email,
            description: dto.description,
            ipAddress,
        });

        this.logger.log(
            `Card charge started: ${reference} for ${dto.amount} ${currency}`
        );

        // MPGS Step 1: Create session
        const { sessionId } = await this.cardProcessor.createSession();

        // MPGS Step 2: Put card data into session
        await this.cardProcessor.updateSessionWithCard(sessionId, {
            number: dto.card.number,
            cvv: dto.card.cvv,
            expiryMonth: dto.card.expiryMonth,
            expiryYear: dto.card.expiryYear,
        });

        const orderId = this.paymentUtil.generateOrderId();
        const txnId = this.paymentUtil.generateTransactionId();

        // MPGS Step 3: Initiate 3DS Authentication
        const authResult = await this.cardProcessor.initiate3dsAuth({
            sessionId,
            orderId,
            transactionId: txnId,
            currency,
        });

        // Update transaction with MPGS session info
        await this.paymentRepository.updateTransaction(transaction.id, {
            channel: EnumTransactionChannel.card,
            status: EnumTransactionStatus.processing,
            processorChannel: this.cardProviderName,
            mpgsSessionId: sessionId,
            mpgsOrderId: orderId,
            mpgsAuthTxnId: txnId,
        });

        // No 3DS available or not supported → skip auth, pay directly with new session
        if (
            authResult.gatewayRecommendation === 'DO_NOT_PROCEED' ||
            authResult.version === 'NONE'
        ) {
            this.logger.log(
                `No 3DS for ${reference}, creating new session for PAY`
            );
            // Need a fresh session since INITIATE_AUTHENTICATION consumed the first one
            const { sessionId: paySessionId } =
                await this.cardProcessor.createSession();
            await this.cardProcessor.updateSessionWithCard(paySessionId, {
                number: dto.card.number,
                cvv: dto.card.cvv,
                expiryMonth: dto.card.expiryMonth,
                expiryYear: dto.card.expiryYear,
            });
            // Update the session ID for PAY
            await this.paymentRepository.updateTransaction(transaction.id, {
                mpgsSessionId: paySessionId,
                mpgsAuthTxnId: undefined,
            });
            return this.executePayment(transaction.id, reference);
        }

        // MPGS Step 4: Authenticate payer (3DS)
        const authenticateResult = await this.cardProcessor.authenticatePayer({
            sessionId,
            orderId,
            transactionId: txnId,
            amount: dto.amount / 100, // MPGS expects decimal, not kobo
            currency,
            redirectResponseUrl: this.redirectResponseUrl,
            deviceInfo: {
                ipAddress,
                browser: 'MOZILLA',
            },
        });

        // Frictionless → PAY immediately
        if (
            authenticateResult.gatewayRecommendation === 'PROCEED' &&
            !authenticateResult.authenticationHtml
        ) {
            return this.executePayment(transaction.id, reference);
        }

        // Challenge → return 3DS HTML to frontend
        if (authenticateResult.authenticationHtml) {
            await this.paymentRepository.updateTransaction(transaction.id, {
                mpgs3dsHtml: authenticateResult.authenticationHtml,
            });

            return {
                status: '3ds_required',
                reference,
                threeDsHtml: authenticateResult.authenticationHtml,
            };
        }

        // Fallback → try PAY
        return this.executePayment(transaction.id, reference);
    }

    async complete3ds(
        reference: string
    ): Promise<{ status: string; reference: string }> {
        const transaction =
            await this.paymentRepository.findTransactionByReference(reference);

        if (!transaction) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.transactionNotFound,
                message: 'payment.error.transactionNotFound',
            });
        }

        if (transaction.status !== EnumTransactionStatus.processing) {
            throw new BadRequestException({
                statusCode:
                    EnumPaymentStatusCodeError.transactionAlreadyProcessed,
                message: 'payment.error.transactionAlreadyProcessed',
            });
        }

        return this.executePayment(transaction.id, reference);
    }

    async handle3dsCallback(): Promise<{ status: string; reference: string }> {
        const transaction =
            await this.paymentRepository.findProcessingTransaction();

        if (!transaction) {
            return { status: 'failed', reference: 'unknown' };
        }

        return this.executePayment(transaction.id, transaction.reference);
    }

    async chargeBankTransfer(
        dto: PaymentChargeBankTransferRequestDto
    ): Promise<{
        status: string;
        reference: string;
        accountNumber: string;
        bankName: string;
        accountName: string;
        expiresAt: Date;
    }> {
        const merchant = await this.paymentRepository.findDefaultMerchant();
        if (!merchant) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.merchantNotFound,
                message: 'payment.error.merchantNotFound',
            });
        }

        const reference = this.paymentUtil.generateReference();
        const currency = dto.currency ?? 'NGN';

        const transaction = await this.paymentRepository.createTransaction({
            merchantId: merchant.id,
            reference,
            amount: dto.amount,
            currency,
            email: dto.email,
            description: dto.description,
        });

        this.logger.log(
            `Bank transfer charge started: ${reference} for ${dto.amount} ${currency}`
        );

        const virtualAccount =
            await this.bankTransferProcessor.createVirtualAccount({
                amount: dto.amount,
                currency,
                customerEmail: dto.email,
                reference,
            });

        const fees = this.paymentUtil.calculateTransferInflowFee(dto.amount);

        await this.paymentRepository.updateTransaction(transaction.id, {
            channel: EnumTransactionChannel.bank_transfer,
            status: EnumTransactionStatus.processing,
            processorChannel: this.bankTransferProviderName,
            processorReference: virtualAccount.providerReference,
            fees,
            bankTransferAccountNumber: virtualAccount.accountNumber,
            bankTransferBankName: virtualAccount.bankName,
            bankTransferExpiresAt: virtualAccount.expiresAt,
        });

        return {
            status: 'awaiting_transfer',
            reference,
            accountNumber: virtualAccount.accountNumber,
            bankName: virtualAccount.bankName,
            accountName: virtualAccount.accountName,
            expiresAt: virtualAccount.expiresAt,
        };
    }

    async chargeBankPayment(dto: PaymentChargeBankPaymentRequestDto): Promise<{
        status: string;
        transactionReference: string;
        paymentReference: string;
        amount: number;
        currency: string;
        fee: number;
        redirectUrl: string;
        bankName: string;
    }> {
        const merchant = await this.paymentRepository.findDefaultMerchant();
        if (!merchant) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.merchantNotFound,
                message: 'payment.error.merchantNotFound',
            });
        }

        const reference = this.paymentUtil.generateReference();
        const currency = dto.currency ?? 'NGN';

        const transaction = await this.paymentRepository.createTransaction({
            merchantId: merchant.id,
            reference,
            amount: dto.amount,
            currency,
            email: dto.email,
            description: dto.description,
        });

        this.logger.log(
            `Bank payment charge started: ${reference} for ${dto.amount} ${currency}`
        );

        const bankPayment =
            await this.bankPaymentProcessor.createVirtualAccount({
                amount: dto.amount,
                currency,
                customerEmail: dto.email,
                customerName: dto.customerName,
                reference,
                bankCode: dto.bankCode,
                redirectUrl: dto.redirectUrl,
                merchantBearsCost: dto.merchantBearsCost,
            });

        const fees = this.paymentUtil.calculateTransferInflowFee(dto.amount);

        await this.paymentRepository.updateTransaction(transaction.id, {
            channel: EnumTransactionChannel.bank_transfer,
            status: EnumTransactionStatus.processing,
            processorChannel: 'korapay',
            processorReference: bankPayment.providerReference,
            fees,
            bankTransferAccountNumber: bankPayment.accountNumber,
            bankTransferBankName: bankPayment.bankName,
            bankTransferExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        });

        return {
            status: 'processing',
            transactionReference: bankPayment.providerReference ?? '',
            paymentReference: reference,
            amount: dto.amount,
            currency,
            fee: fees,
            redirectUrl: bankPayment.redirectUrl ?? '',
            bankName: bankPayment.bankName,
        };
    }

    async getPayWithBankBanks(): Promise<
        Array<{ code: string; name: string; slug: string }>
    > {
        // Return hardcoded list of supported banks for Korapay Pay with Bank
        // These are the banks currently supported by Korapay for pay-with-bank feature
        return [
            {
                code: '100004',
                name: 'Opay',
                slug: 'opay',
            },
            {
                code: '100033',
                name: 'Palmpay',
                slug: 'palmpay',
            },
        ];
    }

    async chargeUssd(dto: PaymentChargeUssdRequestDto): Promise<{
        status: string;
        reference: string;
        ussdCode: string;
    }> {
        const merchant = await this.paymentRepository.findDefaultMerchant();
        if (!merchant) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.merchantNotFound,
                message: 'payment.error.merchantNotFound',
            });
        }

        const reference = this.paymentUtil.generateReference();
        const currency = dto.currency ?? 'NGN';

        const transaction = await this.paymentRepository.createTransaction({
            merchantId: merchant.id,
            reference,
            amount: dto.amount,
            currency,
            email: dto.email,
            description: dto.description,
        });

        this.logger.log(
            `USSD charge started: ${reference} for ${dto.amount} ${currency}`
        );

        const ussdResult = await this.ussdProcessor.initiateCharge({
            amount: dto.amount,
            currency,
            email: dto.email,
            reference,
            phoneNumber: dto.phoneNumber,
        });

        await this.paymentRepository.updateTransaction(transaction.id, {
            channel: EnumTransactionChannel.ussd,
            status: EnumTransactionStatus.processing,
            processorChannel: this.ussdProviderName,
            processorReference: ussdResult.processorReference,
            ussdCode: ussdResult.ussdCode,
        });

        return {
            status: 'pending',
            reference,
            ussdCode: ussdResult.ussdCode,
        };
    }

    async verify(reference: string): Promise<{
        status: string;
        amount: number;
        currency: string;
        channel: string | null;
        reference: string;
        paidAt: Date | null;
        fees: number;
        metadata: unknown;
    }> {
        let transaction =
            await this.paymentRepository.findTransactionByReference(reference);

        if (!transaction) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.transactionNotFound,
                message: 'payment.error.transactionNotFound',
            });
        }

        // Already settled — return immediately without polling processor
        if (transaction.status !== EnumTransactionStatus.processing) {
            return {
                status: transaction.status,
                amount: transaction.amount,
                currency: transaction.currency,
                channel: transaction.channel,
                reference: transaction.reference,
                paidAt: transaction.paidAt,
                fees: transaction.fees,
                metadata: transaction.metadata,
            };
        }

        // Still processing — check real status from the payment processor
        const verifiableProviders = ['alatpay', 'korapay'];
        if (
            transaction.processorChannel &&
            verifiableProviders.includes(transaction.processorChannel)
        ) {
            try {
                let remoteStatus: 'success' | 'pending' | 'failed' = 'pending';

                if (
                    transaction.channel === EnumTransactionChannel.bank_transfer
                ) {
                    const result =
                        await this.bankTransferProcessor.verifyPayment(
                            transaction.processorReference ??
                                transaction.reference
                        );
                    remoteStatus = result.status;
                } else if (
                    transaction.channel === EnumTransactionChannel.ussd
                ) {
                    const result = await this.ussdProcessor.verifyCharge(
                        transaction.processorReference ?? transaction.reference
                    );
                    remoteStatus = result.status;
                }

                const provider = transaction.processorChannel;
                if (remoteStatus === 'success') {
                    await this.paymentRepository.updateTransaction(
                        transaction.id,
                        {
                            status: EnumTransactionStatus.success,
                            paidAt: new Date(),
                            gatewayResponse: `Verified via ${provider} API`,
                        }
                    );
                    this.logger.log(
                        `Payment verified via ${provider}: ${reference}`
                    );
                } else if (remoteStatus === 'failed') {
                    await this.paymentRepository.updateTransaction(
                        transaction.id,
                        {
                            status: EnumTransactionStatus.failed,
                            failedAt: new Date(),
                            gatewayResponse: `Failed (verified via ${provider} API)`,
                        }
                    );
                    this.logger.warn(
                        `Payment failed via ${provider}: ${reference}`
                    );
                }

                // Re-read to get updated values
                if (remoteStatus !== 'pending') {
                    transaction =
                        (await this.paymentRepository.findTransactionByReference(
                            reference
                        ))!;
                }
            } catch (error: unknown) {
                this.logger.warn(
                    `Verify failed for ${reference}: ${(error as Error).message}`
                );
            }
        }

        return {
            status: transaction!.status,
            amount: transaction!.amount,
            currency: transaction!.currency,
            channel: transaction!.channel,
            reference: transaction!.reference,
            paidAt: transaction!.paidAt,
            fees: transaction!.fees,
            metadata: transaction!.metadata,
        };
    }

    async completeUssd(
        reference: string,
        phoneNumber: string
    ): Promise<{ status: string; reference: string }> {
        const transaction =
            await this.paymentRepository.findTransactionByReference(reference);

        if (!transaction) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.transactionNotFound,
                message: 'payment.error.transactionNotFound',
            });
        }

        if (transaction.status !== EnumTransactionStatus.processing) {
            throw new BadRequestException({
                statusCode:
                    EnumPaymentStatusCodeError.transactionAlreadyProcessed,
                message: 'payment.error.transactionAlreadyProcessed',
            });
        }

        if (!transaction.processorReference) {
            throw new BadRequestException({
                statusCode: EnumPaymentStatusCodeError.processorError,
                message: 'payment.error.processorError',
            });
        }

        const result = await this.ussdProcessor.completeCharge({
            phoneNumber,
            amount: transaction.amount,
            currency: transaction.currency,
            transactionId: transaction.processorReference,
        });

        if (result.status === 'success') {
            await this.paymentRepository.updateTransaction(transaction.id, {
                status: EnumTransactionStatus.success,
                paidAt: new Date(),
            });
            this.logger.log(`Phone payment successful: ${reference}`);
            return { status: 'success', reference };
        }

        if (result.status === 'failed') {
            await this.paymentRepository.updateTransaction(transaction.id, {
                status: EnumTransactionStatus.failed,
                failedAt: new Date(),
            });
            this.logger.warn(`Phone payment failed: ${reference}`);
            return { status: 'failed', reference };
        }

        // Still pending — a phone prompt was sent
        this.logger.log(`Phone payment pending (prompt sent): ${reference}`);
        return { status: 'pending', reference };
    }

    async handleAlatpayWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<void> {
        const event = await this.alatpayBankTransfer.validateWebhook(
            payload,
            headers
        );

        if (event.eventType === 'payin.received' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.success,
                    paidAt: new Date(),
                    processorReference: event.paymentId,
                    processorResponse: event.raw,
                    gatewayResponse:
                        'Payment received via AlatPay bank transfer',
                }
            );
            this.logger.log(
                `AlatPay bank transfer confirmed for reference: ${event.reference}`
            );
        }
    }

    async handleKorapayWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<void> {
        const event = await this.korapayBankTransfer.validateWebhook(
            payload,
            headers
        );

        if (event.eventType === 'charge.success' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.success,
                    paidAt: new Date(),
                    processorReference: event.paymentId,
                    processorResponse: event.raw,
                    gatewayResponse:
                        'Payment received via Korapay bank transfer',
                }
            );
            this.logger.log(
                `Korapay bank transfer confirmed for reference: ${event.reference}`
            );
        } else if (event.eventType === 'charge.failed' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.failed,
                    failedAt: new Date(),
                    processorResponse: event.raw,
                    gatewayResponse: 'Payment failed via Korapay',
                }
            );
            this.logger.warn(
                `Korapay payment failed for reference: ${event.reference}`
            );
        }
    }

    async handleKorapayBankPaymentWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<void> {
        const event = await this.bankPaymentProcessor.validateWebhook(
            payload,
            headers
        );

        if (event.status === 'success' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.success,
                    paidAt: new Date(),
                    processorReference: event.paymentId,
                    processorResponse: event.raw,
                    gatewayResponse:
                        'Payment received via Korapay bank payment',
                }
            );
            this.logger.log(
                `Korapay bank payment confirmed for reference: ${event.reference}`
            );
        } else if (event.status === 'failed' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.failed,
                    failedAt: new Date(),
                    processorResponse: event.raw,
                    gatewayResponse: 'Payment failed via Korapay bank payment',
                }
            );
            this.logger.warn(
                `Korapay bank payment failed for reference: ${event.reference}`
            );
        }
    }

    async handleAlatpayUssdWebhook(
        payload: Record<string, unknown>,
        headers: Record<string, string>
    ): Promise<void> {
        const event = await this.ussdProcessor.validateWebhook(
            payload,
            headers
        );

        if (event.reference) {
            const status =
                event.status === 'success'
                    ? EnumTransactionStatus.success
                    : EnumTransactionStatus.failed;

            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status,
                    paidAt:
                        status === EnumTransactionStatus.success
                            ? new Date()
                            : undefined,
                    failedAt:
                        status === EnumTransactionStatus.failed
                            ? new Date()
                            : undefined,
                    processorResponse: event.raw,
                    gatewayResponse: `Phone payment ${event.status}`,
                }
            );
            this.logger.log(
                `Phone payment ${event.status} for reference: ${event.reference}`
            );
        }
    }

    private async executePayment(
        transactionId: string,
        reference: string
    ): Promise<{ status: string; reference: string }> {
        const transaction =
            await this.paymentRepository.findTransactionById(transactionId);

        if (!transaction || !transaction.mpgsSessionId) {
            throw new BadRequestException({
                statusCode: EnumPaymentStatusCodeError.processorError,
                message: 'payment.error.processorError',
            });
        }

        const fees = this.paymentUtil.calculateCardFee(transaction.amount);

        const payResult = await this.cardProcessor.pay({
            sessionId: transaction.mpgsSessionId!,
            orderId: transaction.mpgsOrderId ?? '',
            authTransactionId: transaction.mpgsAuthTxnId ?? '',
            amount: transaction.amount / 100,
            currency: transaction.currency,
        });

        if (payResult.status === 'success') {
            await this.paymentRepository.updateTransaction(transactionId, {
                status: EnumTransactionStatus.success,
                paidAt: new Date(),
                fees,
                processorReference: payResult.transactionReference,
                processorResponse: payResult.processorResponse as Record<
                    string,
                    unknown
                >,
                gatewayResponse: payResult.gatewayCode,
            });

            this.logger.log(`Payment successful: ${reference}`);
            return { status: 'success', reference };
        }

        await this.paymentRepository.updateTransaction(transactionId, {
            status: EnumTransactionStatus.failed,
            failedAt: new Date(),
            processorReference: payResult.transactionReference,
            processorResponse: payResult.processorResponse as Record<
                string,
                unknown
            >,
            gatewayResponse: payResult.gatewayCode ?? payResult.status,
        });

        this.logger.warn(`Payment failed: ${reference}`);
        return { status: 'failed', reference };
    }
}
