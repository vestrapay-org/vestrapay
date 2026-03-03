import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentChargeBankTransferRequestDto {
    @ApiProperty({
        description: 'Transaction reference from initialize',
        example: 'VPY_ref_abc123',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    reference: string;
}
