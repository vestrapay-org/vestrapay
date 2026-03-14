import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ALATPAY_BANK_TRANSFER_PROCESSOR,
    BANK_TRANSFER_PROCESSOR,
    BANK_PAYMENT_PROCESSOR,
    CARD_PROCESSOR,
    KORAPAY_BANK_TRANSFER_PROCESSOR,
    KORAPAY_BANK_PAYMENT_PROCESSOR,
    KORAPAY_CARD_PROCESSOR,
    MPGS_CARD_PROCESSOR,
    USSD_PROCESSOR,
} from '@modules/processor/constants/processor.constant';
import { MpgsCardAdapter } from '@modules/processor/adapters/mpgs/mpgs-card.adapter';
import { AlatpayBankTransferAdapter } from '@modules/processor/adapters/alatpay/alatpay-bank-transfer.adapter';
import { AlatpayUssdAdapter } from '@modules/processor/adapters/alatpay/alatpay-ussd.adapter';
import { KorapayBankTransferAdapter } from '@modules/processor/adapters/korapay/korapay-bank-transfer.adapter';
import { KorapayBankPaymentAdapter } from '@modules/processor/adapters/korapay/korapay-bank-payment.adapter';
import { KorapayCardAdapter } from '@modules/processor/adapters/korapay/korapay-card.adapter';
import { ICardProcessor } from '@modules/processor/interfaces/card-processor.interface';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';

@Global()
@Module({
    providers: [
        {
            provide: MPGS_CARD_PROCESSOR,
            useClass: MpgsCardAdapter,
        },
        {
            provide: KORAPAY_CARD_PROCESSOR,
            useClass: KorapayCardAdapter,
        },
        {
            provide: CARD_PROCESSOR,
            useFactory: (
                config: ConfigService,
                mpgs: ICardProcessor,
                korapay: ICardProcessor
            ) =>
                config.get('payment.providers.card') === 'korapay'
                    ? korapay
                    : mpgs,
            inject: [
                ConfigService,
                MPGS_CARD_PROCESSOR,
                KORAPAY_CARD_PROCESSOR,
            ],
        },
        {
            provide: ALATPAY_BANK_TRANSFER_PROCESSOR,
            useClass: AlatpayBankTransferAdapter,
        },
        {
            provide: KORAPAY_BANK_TRANSFER_PROCESSOR,
            useClass: KorapayBankTransferAdapter,
        },
        {
            provide: BANK_TRANSFER_PROCESSOR,
            useFactory: (
                config: ConfigService,
                alatpay: IBankTransferProcessor,
                korapay: IBankTransferProcessor
            ) =>
                config.get('payment.providers.bankTransfer') === 'korapay'
                    ? korapay
                    : alatpay,
            inject: [
                ConfigService,
                ALATPAY_BANK_TRANSFER_PROCESSOR,
                KORAPAY_BANK_TRANSFER_PROCESSOR,
            ],
        },
        {
            provide: KORAPAY_BANK_PAYMENT_PROCESSOR,
            useClass: KorapayBankPaymentAdapter,
        },
        {
            provide: BANK_PAYMENT_PROCESSOR,
            useFactory: (
                config: ConfigService,
                korapay: IBankTransferProcessor
            ) => korapay,
            inject: [ConfigService, KORAPAY_BANK_PAYMENT_PROCESSOR],
        },
        {
            provide: USSD_PROCESSOR,
            useClass: AlatpayUssdAdapter,
        },
    ],
    exports: [
        CARD_PROCESSOR,
        MPGS_CARD_PROCESSOR,
        KORAPAY_CARD_PROCESSOR,
        BANK_TRANSFER_PROCESSOR,
        BANK_PAYMENT_PROCESSOR,
        ALATPAY_BANK_TRANSFER_PROCESSOR,
        KORAPAY_BANK_TRANSFER_PROCESSOR,
        KORAPAY_BANK_PAYMENT_PROCESSOR,
        USSD_PROCESSOR,
    ],
})
export class ProcessorModule {}
