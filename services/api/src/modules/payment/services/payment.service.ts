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
    BANK_TRANSFER_PROCESSOR,
    CARD_PROCESSOR,
    USSD_PROCESSOR,
} from '@modules/processor/constants/processor.constant';
import { ICardProcessor } from '@modules/processor/interfaces/card-processor.interface';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import { IUssdProcessor } from '@modules/processor/interfaces/ussd-processor.interface';
import { EnumPaymentStatusCodeError } from '@modules/payment/enums/payment.status-code.enum';
import { PaymentChargeCardRequestDto } from '@modules/payment/dtos/request/payment.charge-card.request.dto';
import { PaymentChargeBankTransferRequestDto } from '@modules/payment/dtos/request/payment.charge-bank-transfer.request.dto';
import { PaymentChargeUssdRequestDto } from '@modules/payment/dtos/request/payment.charge-ussd.request.dto';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly redirectResponseUrl: string;

    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentUtil: PaymentUtil,
        private readonly configService: ConfigService,
        @Inject(CARD_PROCESSOR)
        private readonly cardProcessor: ICardProcessor,
        @Inject(BANK_TRANSFER_PROCESSOR)
        private readonly bankTransferProcessor: IBankTransferProcessor,
        @Inject(USSD_PROCESSOR)
        private readonly ussdProcessor: IUssdProcessor
    ) {
        const baseUrl = (
            process.env.APP_PUBLIC_URL ??
            `http://localhost:${this.configService.get<number>('app.http.port')}`
        ).replace(/\/+$/, '');
        this.redirectResponseUrl = `${baseUrl}/api/v1/public/payment/3ds-callback`;
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
            processorChannel: 'mpgs',
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
                mpgsAuthTxnId: null,
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
            processorChannel: 'alatpay',
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
            processorChannel: 'alatpay',
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
        const transaction =
            await this.paymentRepository.findTransactionByReference(reference);

        if (!transaction) {
            throw new NotFoundException({
                statusCode: EnumPaymentStatusCodeError.transactionNotFound,
                message: 'payment.error.transactionNotFound',
            });
        }

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
        const event =
            await this.bankTransferProcessor.validateWebhook(payload, headers);

        if (event.eventType === 'payin.received' && event.reference) {
            await this.paymentRepository.updateTransactionByReference(
                event.reference,
                {
                    status: EnumTransactionStatus.success,
                    paidAt: new Date(),
                    processorReference: event.paymentId,
                    processorResponse: event.raw,
                    gatewayResponse: 'Payment received via bank transfer',
                }
            );
            this.logger.log(
                `Bank transfer confirmed for reference: ${event.reference}`
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
            sessionId: transaction.mpgsSessionId,
            orderId: transaction.mpgsOrderId,
            authTransactionId: transaction.mpgsAuthTxnId,
            amount: transaction.amount / 100,
            currency: transaction.currency,
        });

        if (payResult.status === 'success') {
            await this.paymentRepository.updateTransaction(transactionId, {
                status: EnumTransactionStatus.success,
                paidAt: new Date(),
                fees,
                processorReference: payResult.transactionReference,
                processorResponse:
                    payResult.processorResponse as Record<string, unknown>,
                gatewayResponse: payResult.gatewayCode,
            });

            this.logger.log(`Payment successful: ${reference}`);
            return { status: 'success', reference };
        }

        await this.paymentRepository.updateTransaction(transactionId, {
            status: EnumTransactionStatus.failed,
            failedAt: new Date(),
            processorReference: payResult.transactionReference,
            processorResponse:
                payResult.processorResponse as Record<string, unknown>,
            gatewayResponse:
                payResult.gatewayCode ?? payResult.status,
        });

        this.logger.warn(`Payment failed: ${reference}`);
        return { status: 'failed', reference };
    }
}
