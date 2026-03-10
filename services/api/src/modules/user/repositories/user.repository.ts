import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import {
    IAuthPassword,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { IRole } from '@modules/role/interfaces/role.interface';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    IUser,
    IUserLogin,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserStatus,
    User,
} from '@prisma/client';

@Injectable()
export class UserRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffset(
        { where, ...params }: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IUser>> {
        return this.paginationService.offset<IUser>(this.databaseService.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...role,
                deletedAt: null,
            } as IPaginationQueryOffsetParams['where'],
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        });
    }

    async findWithPaginationCursor(
        { where, ...params }: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<IUser>> {
        return this.paginationService.cursor<IUser>(this.databaseService.user, {
            ...params,
            where: {
                ...where,
                ...status,
                ...role,
                deletedAt: null,
            } as IPaginationQueryCursorParams['where'],
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        });
    }

    async findAllByEmails(emails: string[]): Promise<IUser[]> {
        return this.databaseService.user.findMany({
            where: {
                email: { in: emails },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser[]>;
    }

    async findAllExport(
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IUser[]> {
        return this.databaseService.user.findMany({
            where: {
                ...status,
                ...role,
                deletedAt: null,
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser[]>;
    }

    async findOneById(id: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
        });
    }

    async findOneActiveById(id: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneActiveByEmail(email: string): Promise<User | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null, status: EnumUserStatus.active },
        });
    }

    async findOneWithRoleByEmail(email: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser | null>;
    }

    async findOneProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUserProfile | null>;
    }

    async findOneActiveProfileById(id: string): Promise<IUserProfile | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null, status: EnumUserStatus.active },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUserProfile | null>;
    }

    async findOneWithRoleById(id: string): Promise<IUser | null> {
        return this.databaseService.user.findUnique({
            where: { id, deletedAt: null },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser | null>;
    }

    async existByEmail(email: string): Promise<{ id: string } | null> {
        return this.databaseService.user.findFirst({
            where: { email: email },
            select: { id: true },
        });
    }

    async existByUsername(username: string): Promise<{ id: string } | null> {
        return this.databaseService.user.findUnique({
            where: { username },
            select: { id: true },
        });
    }

    async createByAdmin(
        username: string,
        { email, name }: UserCreateRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { id: roleId, type: roleType }: IRole,
        { ipAddress, userAgent }: IRequestLog,
        createdBy: string
    ): Promise<User> {
        const userId = this.databaseUtil.createId();
        return this.databaseService.user.create({
            data: {
                id: userId,
                email,
                roleId,
                name,
                signUpFrom: EnumUserSignUpFrom.admin,
                passwordCreated,
                passwordExpired,
                password: passwordHash,
                passwordAttempt: 0,
                username,
                isVerified: roleType === EnumRoleType.user ? false : true,
                status: EnumUserStatus.active,
                createdBy,
                deletedAt: null,
                twoFactor: {
                    create: {
                        enabled: false,
                        requiredSetup: false,
                        createdBy,
                    },
                },
            },
        });
    }

    async updateStatusByAdmin(
        id: string,
        { status }: UserUpdateStatusRequestDto,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id, deletedAt: null },
            data: {
                status,
                updatedBy,
            },
        });
    }

    async updateProfile(
        userId: string,
        data: Record<string, any>,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                ...data,
                updatedBy: userId,
            },
        });
    }

    async deleteSelf(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const deletedAt = this.helperService.dateCreate();
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                deletedAt,
                deletedBy: userId,
                updatedBy: userId,
                status: EnumUserStatus.inactive,
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: deletedAt },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: deletedAt,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                username,
                updatedBy: userId,
            },
        });
    }

    async updatePasswordByAdmin(
        userId: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog,
        updatedBy: string
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy,
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: { gte: passwordCreated },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: passwordCreated,
                            updatedBy,
                        },
                    },
                },
            },
        });
    }

    async increasePasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: {
                    increment: 1,
                },
            },
        });
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                passwordAttempt: 0,
            },
        });
    }

    async changePassword(
        userId: string,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                password: passwordHash,
                passwordCreated,
                passwordExpired,
                passwordAttempt: 0,
                updatedBy: userId,
                sessions: {
                    updateMany: {
                        where: {
                            isRevoked: false,
                            expiredAt: {
                                gte: passwordCreated,
                            },
                        },
                        data: {
                            isRevoked: true,
                            revokedAt: passwordCreated,
                            updatedBy: userId,
                        },
                    },
                },
            },
        });
    }

    async login(
        userId: string,
        { loginFrom, sessionId, expiredAt, jti }: IUserLogin,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: this.helperService.dateCreate(),
                lastIPAddress: ipAddress,
                lastLoginFrom: loginFrom,
                updatedBy: userId,
                sessions: {
                    create: {
                        id: sessionId,
                        jti,
                        expiredAt,
                        isRevoked: false,
                        ipAddress,
                        userAgent: this.databaseUtil.toPlainObject(userAgent),
                        createdBy: userId,
                    },
                },
            },
        });
    }

    async verify(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                isVerified: true,
                updatedBy: userId,
            },
        });
    }

    async signUp(
        username: string,
        roleId: string,
        {
            email,
            marketing,
            name,
            from,
            cookies,
        }: UserSignUpRequestDto,
        {
            passwordCreated,
            passwordExpired,
            passwordHash,
            passwordPeriodExpired,
        }: IAuthPassword,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        const userId = this.databaseUtil.createId();
        return this.databaseService.user.create({
            data: {
                id: userId,
                email,
                name,
                roleId,
                signUpFrom: from,
                username,
                isVerified: true,
                status: EnumUserStatus.active,
                passwordCreated,
                passwordExpired,
                password: passwordHash,
                passwordAttempt: 0,
                createdBy: userId,
                deletedAt: null,
                twoFactor: {
                    create: {
                        enabled: false,
                        requiredSetup: false,
                        createdBy: userId,
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
            },
        });
    }

    async refresh(
        userId: string,
        { loginFrom, sessionId, jti }: IUserLogin,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                lastLoginAt: this.helperService.dateCreate(),
                lastIPAddress: ipAddress,
                lastLoginFrom: loginFrom,
                updatedBy: userId,
                sessions: {
                    update: {
                        where: {
                            id: sessionId,
                        },
                        data: {
                            jti,
                        },
                    },
                },
            },
        });
    }

    async reachMaxPasswordAttempt(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                status: EnumUserStatus.inactive,
            },
        });
    }

    async verifyTwoFactor(
        userId: string,
        { method, newBackupCodes }: IAuthTwoFactorVerifyResult,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        lastUsedAt: this.helperService.dateCreate(),
                        ...(method === EnumAuthTwoFactorMethod.backupCodes && {
                            backupCodes: newBackupCodes,
                        }),
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser>;
    }

    async setupTwoFactor(
        userId: string,
        secretEncrypted: string,
        iv: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        secret: secretEncrypted,
                        iv,
                        updatedAt: now,
                        updatedBy: userId,
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser>;
    }

    async enableTwoFactor(
        userId: string,
        backupCodesHashed: string[],
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.$transaction(async tx => {
            const twoFactor = await tx.twoFactor.findUnique({
                where: { userId },
                select: {
                    confirmedAt: true,
                },
            });

            return tx.user.update({
                where: { id: userId, deletedAt: null },
                data: {
                    twoFactor: {
                        update: {
                            enabled: true,
                            confirmedAt: twoFactor?.confirmedAt ?? now,
                            backupCodes: backupCodesHashed,
                            lastUsedAt: now,
                            updatedAt: now,
                            updatedBy: userId,
                        },
                    },
                },
                include: {
                    role: { include: { abilities: true } },
                    twoFactor: true,
                },
            }) as unknown as IUser;
        }) as Promise<IUser>;
    }

    async disableTwoFactor(
        userId: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        enabled: false,
                        requiredSetup: false,
                        backupCodes: [],
                        lastUsedAt: now,
                        secret: null,
                        iv: null,
                        updatedBy: userId,
                        updatedAt: now,
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser>;
    }

    async regenerateTwoFactorBackupCodes(
        userId: string,
        backupCodesHashed: string[],
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        backupCodes: backupCodesHashed,
                        updatedBy: userId,
                        updatedAt: now,
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser>;
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string,
        { ipAddress, userAgent }: IRequestLog
    ): Promise<IUser> {
        const now = this.helperService.dateCreate();

        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        requiredSetup: true,
                        backupCodes: [],
                        secret: null,
                        iv: null,
                        updatedBy: updatedBy,
                        updatedAt: now,
                    },
                },
                sessions: {
                    updateMany: {
                        where: { isRevoked: false, expiredAt: { gte: now } },
                        data: { isRevoked: true, revokedAt: now, updatedBy },
                    },
                },
            },
            include: {
                role: { include: { abilities: true } },
                twoFactor: true,
            },
        }) as Promise<IUser>;
    }

    async increaseTwoFactorAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        attempt: {
                            increment: 1,
                        },
                    },
                },
            },
        });
    }

    async resetTwoFactorAttempt(userId: string): Promise<User> {
        return this.databaseService.user.update({
            where: { id: userId, deletedAt: null },
            data: {
                twoFactor: {
                    update: {
                        attempt: 0,
                    },
                },
            },
        });
    }
}
