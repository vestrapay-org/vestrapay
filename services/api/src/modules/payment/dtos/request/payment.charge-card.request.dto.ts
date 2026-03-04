import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CardDetailsDto {
    @ApiProperty({
        description: 'Card number',
        example: '5123450000000008',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    number: string;

    @ApiProperty({
        description: 'Card CVV',
        example: '100',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @Length(3, 4)
    cvv: string;

    @ApiProperty({
        description: 'Card expiry month',
        example: '05',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @Length(2, 2)
    expiryMonth: string;

    @ApiProperty({
        description: 'Card expiry year',
        example: '26',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @Length(2, 2)
    expiryYear: string;
}

export class PaymentChargeCardRequestDto {
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
        description: 'Card details',
        type: CardDetailsDto,
        required: true,
    })
    @IsNotEmpty()
    @ValidateNested()
    @Type(() => CardDetailsDto)
    card: CardDetailsDto;
}
