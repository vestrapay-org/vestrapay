import { ApiProperty } from '@nestjs/swagger';

export class PaymentVerifyResponseDto {
    @ApiProperty({
        description: 'Current transaction status',
        enum: ['pending', 'processing', 'success', 'failed'],
        example: 'success',
    })
    status: string;

    @ApiProperty({
        description: 'Amount in the smallest currency unit (kobo for NGN)',
        example: 100000,
    })
    amount: number;

    @ApiProperty({
        description: 'Currency code',
        example: 'NGN',
    })
    currency: string;

    @ApiProperty({
        description: 'Payment channel used',
        enum: ['card', 'bank_transfer', 'ussd'],
        nullable: true,
        example: 'card',
    })
    channel: string | null;

    @ApiProperty({
        description: 'Transaction reference',
        example: 'VPY_MMARA6NS_B19910D6DA76',
    })
    reference: string;

    @ApiProperty({
        description: 'Timestamp when payment was confirmed. Null if not yet paid.',
        nullable: true,
        example: '2026-03-03T10:00:00.000Z',
    })
    paidAt: Date | null;

    @ApiProperty({
        description: 'Fees charged in the smallest currency unit',
        example: 1500,
    })
    fees: number;

    @ApiProperty({
        description: 'Any metadata passed during the charge request',
        nullable: true,
        example: { orderId: '123' },
    })
    metadata: unknown;
}
