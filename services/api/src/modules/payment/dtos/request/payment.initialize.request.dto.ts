import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { EnumTransactionChannel } from '@prisma/client';

export class PaymentInitializeRequestDto {
    @ApiProperty({
        description: 'Amount in kobo (100 = ₦1)',
        example: 100000,
        required: true,
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(100)
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
        description: 'Customer email address',
        example: 'customer@example.com',
        required: true,
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Payment description',
        example: 'Payment for order #123',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Payment channel',
        example: EnumTransactionChannel.card,
        enum: EnumTransactionChannel,
        required: false,
    })
    @IsOptional()
    @IsEnum(EnumTransactionChannel)
    channel?: EnumTransactionChannel;

    @ApiProperty({
        description: 'Additional metadata',
        example: { orderId: '123' },
        required: false,
    })
    @IsOptional()
    metadata?: Record<string, unknown>;
}
