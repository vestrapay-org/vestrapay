import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsBoolean,
    Min,
} from 'class-validator';

export class PaymentChargeBankPaymentRequestDto {
    @ApiProperty({
        description:
            'Amount in kobo (100 = ₦1). Minimum is NGN 200 (20000 kobo)',
        example: 600000,
        required: true,
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(20000)
    amount: number;

    @ApiProperty({
        description: 'Currency code',
        example: 'NGN',
        required: false,
        default: 'NGN',
    })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({
        description: 'Korapay bank code for pay-with-bank',
        example: '100004',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    bankCode: string;

    @ApiProperty({
        description: 'Customer email address',
        example: 'customer@example.com',
        required: true,
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Customer name',
        example: 'John Doe',
        required: false,
    })
    @IsOptional()
    @IsString()
    customerName?: string;

    @ApiProperty({
        description: 'Payment description/narration',
        example: 'Payment for order #123',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Redirect URL after payment',
        example: 'https://example.com/checkout/callback',
        required: false,
    })
    @IsOptional()
    @IsString()
    redirectUrl?: string;

    @ApiProperty({
        description: 'Whether merchant bears the transaction fee',
        example: true,
        required: false,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    merchantBearsCost?: boolean;
}
