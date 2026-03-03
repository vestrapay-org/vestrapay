import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class Payment3dsCompleteRequestDto {
    @ApiProperty({
        description: 'Transaction reference',
        example: 'VPY_ref_abc123',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    reference: string;
}
