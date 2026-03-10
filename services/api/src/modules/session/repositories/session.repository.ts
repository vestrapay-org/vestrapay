import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ISession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';

@Injectable()
export class SessionRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        { where, ...others }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.offset<ISession>(
            this.databaseService.session,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                } as IPaginationQueryOffsetParams['where'],
                include: {
                    user: true,
                },
            }
        );
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<ISession>> {
        return this.paginationService.cursor<ISession>(
            this.databaseService.session,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                } as IPaginationQueryCursorParams['where'],
                include: {
                    user: true,
                },
            }
        );
    }

    async findAll(userId: string): Promise<
        {
            id: string;
        }[]
    > {
        return this.databaseService.session.findMany({
            where: {
                userId,
                isRevoked: false,
                expiredAt: {
                    gte: this.helperService.dateCreate(),
                },
            },
            select: {
                id: true,
            },
        });
    }

    async findOneActive(userId: string, sessionId: string): Promise<Session | null> {
        const today = this.helperService.dateCreate();

        return this.databaseService.session.findFirst({
            where: {
                id: sessionId,
                userId,
                expiredAt: {
                    gte: today,
                },
                isRevoked: false,
            },
        });
    }

    async revoke(
        userId: string,
        sessionId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<Session> {
        return this.databaseService.session.update({
            where: {
                id: sessionId,
                userId,
            },
            data: {
                isRevoked: true,
                revokedAt: this.helperService.dateCreate(),
                updatedBy: userId,
            },
        });
    }

    async revokeByAdmin(
        sessionId: string,
        { ipAddress, userAgent }: IRequestLog,
        revokeBy: string
    ): Promise<ISession> {
        return this.databaseService.session.update({
            where: {
                id: sessionId,
            },
            data: {
                isRevoked: true,
                revokedAt: this.helperService.dateCreate(),
                updatedBy: revokeBy,
            },
            include: {
                user: true,
            },
        }) as Promise<ISession>;
    }
}
