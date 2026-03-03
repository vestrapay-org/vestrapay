import { Module } from '@nestjs/common';
import { TransactionService } from '@modules/transaction/services/transaction.service';
import { TransactionRepository } from '@modules/transaction/repositories/transaction.repository';

@Module({
    providers: [TransactionService, TransactionRepository],
    exports: [TransactionService, TransactionRepository],
    imports: [],
})
export class TransactionModule {}
