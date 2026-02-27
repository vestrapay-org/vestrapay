import { IActivityLogMetadata } from '@common/response/interfaces/response.interface';
import { RoleAbilitiesResponseDto } from '@modules/role/dtos/response/role.abilities.response.dto';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleDto } from '@modules/role/dtos/role.dto';
import { Injectable } from '@nestjs/common';
import { Role, RoleAbility } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

type RoleWithAbilities = Role & { abilities?: RoleAbility[] };

@Injectable()
export class RoleUtil {
    mapList(roles: RoleWithAbilities[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles);
    }

    mapOne(role: RoleWithAbilities): RoleDto {
        return plainToInstance(RoleDto, role);
    }

    mapAbilities(role: RoleWithAbilities): RoleAbilitiesResponseDto {
        return plainToInstance(RoleAbilitiesResponseDto, {
            abilities: role.abilities ?? [],
        });
    }

    mapActivityLogMetadata(role: Role): IActivityLogMetadata {
        return {
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
            timestamp: role.updatedAt ?? role.createdAt,
        };
    }
}
