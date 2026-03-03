import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '@modules/transaction/repositories/transaction.repository';

@Injectable()
export class TransactionService {
    constructor(
        private readonly transactionRepository: TransactionRepository
    ) {}

    async exportTransactions(): Promise<{
        headers: string[];
        rows: Record<string, unknown>[];
    }> {
        const transactions = await this.transactionRepository.findAll();

        const headers = [
            'Reference',
            'Amount (Kobo)',
            'Currency',
            'Channel',
            'Status',
            'Email',
            'Fees (Kobo)',
            'Paid At',
            'Created At',
        ];

        const rows = transactions.map((txn) => ({
            reference: txn.reference,
            amount: txn.amount,
            currency: txn.currency,
            channel: txn.channel ?? '',
            status: txn.status,
            email: txn.email ?? '',
            fees: txn.fees,
            paidAt: txn.paidAt?.toISOString() ?? '',
            createdAt: txn.createdAt.toISOString(),
        }));

        return { headers, rows };
    }
}
