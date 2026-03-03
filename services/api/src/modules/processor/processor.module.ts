import { Global, Module } from '@nestjs/common';
import {
    BANK_TRANSFER_PROCESSOR,
    CARD_PROCESSOR,
    USSD_PROCESSOR,
} from '@modules/processor/constants/processor.constant';
import { MpgsCardAdapter } from '@modules/processor/adapters/mpgs/mpgs-card.adapter';
import { MockBankTransferAdapter } from '@modules/processor/adapters/mock/mock-bank-transfer.adapter';
import { MockUssdAdapter } from '@modules/processor/adapters/mock/mock-ussd.adapter';

@Global()
@Module({
    providers: [
        {
            provide: CARD_PROCESSOR,
            useClass: MpgsCardAdapter,
        },
        {
            provide: BANK_TRANSFER_PROCESSOR,
            useClass: MockBankTransferAdapter,
        },
        {
            provide: USSD_PROCESSOR,
            useClass: MockUssdAdapter,
        },
    ],
    exports: [CARD_PROCESSOR, BANK_TRANSFER_PROCESSOR, USSD_PROCESSOR],
})
export class ProcessorModule {}
