import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { IRole } from '@modules/role/interfaces/role.interface';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class RoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByAdmin(
        { where, ...params }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<Role>> {
        return this.paginationService.offset<Role>(this.databaseService.role, {
            ...params,
            where: {
                ...where,
                ...type,
            } as IPaginationQueryOffsetParams['where'],
        });
    }

    async findWithPaginationCursor(
        { where, ...params }: IPaginationQueryCursorParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<Role>> {
        return this.paginationService.cursor<Role>(this.databaseService.role, {
            ...params,
            where: {
                ...where,
                ...type,
            } as IPaginationQueryCursorParams['where'],
        });
    }

    async findOneById(id: string): Promise<Role | null> {
        return this.databaseService.role.findUnique({
            where: { id },
            include: {
                abilities: true,
            },
        });
    }

    async existByName(name: string): Promise<IRole | null> {
        return this.databaseService.role.findFirst({
            where: {
                name: name,
            },
            select: { id: true, type: true, name: true },
        });
    }

    async existById(id: string): Promise<IRole | null> {
        return this.databaseService.role.findUnique({
            where: {
                id,
            },
            select: { id: true, type: true, name: true },
        });
    }

    async used(id: string): Promise<{ id: string } | null> {
        return this.databaseService.role.findFirst({
            where: {
                users: {
                    some: {
                        roleId: id,
                    },
                },
            },
            select: { id: true },
        });
    }

    async create({
        name,
        abilities,
        ...others
    }: RoleCreateRequestDto): Promise<Role> {
        return this.databaseService.role.create({
            data: {
                name: name,
                abilities: {
                    create: abilities.map(ability => ({
                        action: ability.action as string[],
                        subject: ability.subject as string,
                    })),
                },
                ...others,
            },
            include: {
                abilities: true,
            },
        });
    }

    async update(
        id: string,
        { abilities, ...others }: RoleUpdateRequestDto
    ): Promise<Role> {
        return this.databaseService.role.update({
            where: { id },
            data: {
                abilities: {
                    deleteMany: {},
                    create: abilities.map(ability => ({
                        action: ability.action as string[],
                        subject: ability.subject as string,
                    })),
                },
                ...others,
            },
            include: {
                abilities: true,
            },
        });
    }

    async delete(id: string): Promise<Role> {
        return this.databaseService.role.delete({ where: { id } });
    }
}
