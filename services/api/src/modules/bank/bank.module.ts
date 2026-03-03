import { Module } from '@nestjs/common';
import { BankService } from '@modules/bank/services/bank.service';

@Module({
    providers: [BankService],
    exports: [BankService],
    imports: [],
})
export class BankModule {}
