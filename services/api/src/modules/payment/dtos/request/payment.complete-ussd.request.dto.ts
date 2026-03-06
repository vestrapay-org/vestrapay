import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentCompleteUssdRequestDto {
    @ApiProperty({
        description: 'Transaction reference from charge/ussd',
        example: 'VPY_ref_abc123',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    reference: string;

    @ApiProperty({
        description: 'Customer phone number for direct debit',
        example: '08134529895',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;
}
