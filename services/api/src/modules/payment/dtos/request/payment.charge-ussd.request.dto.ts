import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PaymentChargeUssdRequestDto {
    @ApiProperty({
        description: 'Transaction reference from initialize',
        example: 'VPY_ref_abc123',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    reference: string;

    @ApiProperty({
        description: 'Bank code for USSD (optional)',
        example: '058',
        required: false,
    })
    @IsOptional()
    @IsString()
    bankCode?: string;
}
