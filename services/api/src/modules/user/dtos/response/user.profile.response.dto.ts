import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { UserDto } from '@modules/user/dtos/user.dto';

export class UserProfileResponseDto extends UserDto {
    @ApiProperty({
        required: true,
        type: RoleDto,
    })
    @Type(() => RoleDto)
    role: RoleDto;
}
