import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { EnumUserGender } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UserUpdateProfileRequestDto extends PickType(
    UserCreateRequestDto,
    ['name'] as const
) {
    @ApiProperty({
        required: true,
        enum: EnumUserGender,
        example: EnumUserGender.male,
    })
    @IsEnum(EnumUserGender)
    @IsNotEmpty()
    gender: EnumUserGender;
}
