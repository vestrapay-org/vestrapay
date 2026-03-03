import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';
import {
    EnumTransactionChannel,
    EnumTransactionStatus,
    Merchant,
    Prisma,
    Transaction,
} from '@prisma/client';

@Injectable()
export class PaymentRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findDefaultMerchant(): Promise<Merchant | null> {
        return this.databaseService.merchant.findFirst({
            where: { isDefault: true },
        });
    }

    async createTransaction(data: {
        merchantId: string;
        reference: string;
        amount: number;
        currency: string;
        email?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        ipAddress?: string;
        channel?: string;
    }): Promise<Transaction> {
        return this.databaseService.transaction.create({
            data: {
                merchantId: data.merchantId,
                reference: data.reference,
                amount: data.amount,
                currency: data.currency ?? 'NGN',
                email: data.email,
                description: data.description,
                metadata:
                    (data.metadata as Prisma.InputJsonValue) ?? undefined,
                ipAddress: data.ipAddress,
                status: EnumTransactionStatus.pending,
            },
        });
    }

    async findTransactionByReference(
        reference: string
    ): Promise<Transaction | null> {
        return this.databaseService.transaction.findUnique({
            where: { reference },
        });
    }

    async findTransactionById(id: string): Promise<Transaction | null> {
        return this.databaseService.transaction.findUnique({
            where: { id },
        });
    }

    async findProcessingTransaction(): Promise<Transaction | null> {
        return this.databaseService.transaction.findFirst({
            where: {
                status: EnumTransactionStatus.processing,
                channel: EnumTransactionChannel.card,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateTransaction(
        id: string,
        data: Partial<{
            status: EnumTransactionStatus;
            channel: EnumTransactionChannel;
            fees: number;
            paidAt: Date;
            failedAt: Date;
            gatewayResponse: string;
            processorReference: string;
            processorResponse: Record<string, unknown>;
            processorChannel: string;
            mpgsSessionId: string;
            mpgsOrderId: string;
            mpgs3dsHtml: string;
            mpgsAuthTxnId: string;
            bankTransferAccountNumber: string;
            bankTransferBankName: string;
            bankTransferExpiresAt: Date;
            ussdCode: string;
        }>
    ): Promise<Transaction> {
        return this.databaseService.transaction.update({
            where: { id },
            data: {
                ...data,
                processorResponse:
                    (data.processorResponse as Prisma.InputJsonValue) ??
                    undefined,
            },
        });
    }

    async updateTransactionByReference(
        reference: string,
        data: Partial<{
            status: EnumTransactionStatus;
            paidAt: Date;
            failedAt: Date;
            gatewayResponse: string;
            processorReference: string;
            processorResponse: Record<string, unknown>;
        }>
    ): Promise<Transaction> {
        return this.databaseService.transaction.update({
            where: { reference },
            data: {
                ...data,
                processorResponse:
                    (data.processorResponse as Prisma.InputJsonValue) ??
                    undefined,
            },
        });
    }
}
