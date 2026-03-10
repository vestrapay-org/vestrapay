import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

@Injectable()
export class PaymentUtil {
    private readonly referencePrefix: string;
    private readonly cardFeePercentage: number;
    private readonly transferInflowPercentage: number;
    private readonly transferInflowCap: number;

    constructor(private readonly configService: ConfigService) {
        this.referencePrefix = this.configService.get<string>(
            'payment.transaction.referencePrefix'
        )!;
        this.cardFeePercentage = this.configService.get<number>(
            'payment.fees.cardPercentage'
        )!;
        this.transferInflowPercentage = this.configService.get<number>(
            'payment.fees.transferInflowPercentage'
        )!;
        this.transferInflowCap = this.configService.get<number>(
            'payment.fees.transferInflowCap'
        )!;
    }

    generateReference(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = randomBytes(6).toString('hex').toUpperCase();
        return `${this.referencePrefix}_${timestamp}_${random}`;
    }

    generateOrderId(): string {
        return `ORD_${Date.now().toString(36).toUpperCase()}_${randomBytes(4).toString('hex').toUpperCase()}`;
    }

    generateTransactionId(): string {
        return `TXN_${Date.now().toString(36).toUpperCase()}_${randomBytes(4).toString('hex').toUpperCase()}`;
    }

    calculateCardFee(amountInKobo: number): number {
        return Math.round((amountInKobo * this.cardFeePercentage) / 100);
    }

    calculateTransferInflowFee(amountInKobo: number): number {
        const fee = Math.round(
            (amountInKobo * this.transferInflowPercentage) / 100
        );
        return Math.min(fee, this.transferInflowCap);
    }
}
