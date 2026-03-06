import { Global, Module } from '@nestjs/common';
import {
    BANK_TRANSFER_PROCESSOR,
    CARD_PROCESSOR,
    USSD_PROCESSOR,
} from '@modules/processor/constants/processor.constant';
import { MpgsCardAdapter } from '@modules/processor/adapters/mpgs/mpgs-card.adapter';
import { AlatpayBankTransferAdapter } from '@modules/processor/adapters/alatpay/alatpay-bank-transfer.adapter';
import { AlatpayUssdAdapter } from '@modules/processor/adapters/alatpay/alatpay-ussd.adapter';

@Global()
@Module({
    providers: [
        {
            provide: CARD_PROCESSOR,
            useClass: MpgsCardAdapter,
        },
        {
            provide: BANK_TRANSFER_PROCESSOR,
            useClass: AlatpayBankTransferAdapter,
        },
        {
            provide: USSD_PROCESSOR,
            useClass: AlatpayUssdAdapter,
        },
    ],
    exports: [CARD_PROCESSOR, BANK_TRANSFER_PROCESSOR, USSD_PROCESSOR],
})
export class ProcessorModule {}
