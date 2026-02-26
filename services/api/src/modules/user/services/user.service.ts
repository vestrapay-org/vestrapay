import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestApp,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthTwoFactorVerify,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EmailService } from '@modules/email/services/email.service';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { SessionRepository } from '@modules/session/repositories/session.repository';
import { SessionUtil } from '@modules/session/utils/session.util';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import {
    UserCheckEmailRequestDto,
    UserCheckUsernameRequestDto,
} from '@modules/user/dtos/request/user.check.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import {
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import {
    UserCheckEmailResponseDto,
    UserCheckUsernameResponseDto,
} from '@modules/user/dtos/response/user.check.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { EnumUserStatus_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { IUser } from '@modules/user/interfaces/user.interface';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserStatus,
} from '@prisma/client';
import { Duration } from 'luxon';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginEnableTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-enable-two-factor.request.dto';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { RequestTooManyException } from '@common/request/exceptions/request.too-many.exception';
import { HelperService } from '@common/helper/services/helper.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService implements IUserService {
    private readonly userRoleName: string;

    constructor(
        private readonly userUtil: UserUtil,
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly authService: AuthService,
        private readonly sessionUtil: SessionUtil,
        private readonly sessionRepository: SessionRepository,
        private readonly featureFlagService: FeatureFlagService,
        private readonly emailService: EmailService,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role');
    }

    async validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser> {
        if (!request.user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const { userId } = request.user;
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.inactiveForbidden,
                message: 'user.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordExpired,
                message: 'auth.error.passwordExpired',
            });
        } else if (requiredVerified === true && user.isVerified !== true) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        }

        return user;
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } =
            await this.userRepository.findWithPaginationOffset(
                pagination,
                status,
                role
            );

        const users: UserListResponseDto[] = this.userUtil.mapList(data);
        return {
            data: users,
            ...others,
        };
    }

    async getListCursor(
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } =
            await this.userRepository.findWithPaginationCursor(
                pagination,
                status,
                role
            );

        const users: UserListResponseDto[] = this.userUtil.mapList(data);
        return {
            data: users,
            ...others,
        };
    }

    async getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>> {
        const user = await this.userRepository.findOneProfileById(id);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        }

        return { data: this.userUtil.mapProfile(user) };
    }

    async createByAdmin(
        { email, name, roleId }: UserCreateRequestDto,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [checkRole, emailExist] = await Promise.all([
            this.roleRepository.existById(roleId),
            this.userRepository.existByEmail(email),
        ]);

        if (!checkRole) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: EnumUserStatus_CODE_ERROR.emailExist,
                message: 'user.error.emailExist',
            });
        }

        try {
            const passwordString = this.authUtil.createPasswordRandom();
            const password: IAuthPassword = this.authUtil.createPassword(
                passwordString,
                {
                    temporary: true,
                }
            );
            const randomUsername = this.userUtil.createRandomUsername();
            const created = await this.userRepository.createByAdmin(
                randomUsername,
                {
                    email,
                    name,
                    roleId,
                } as UserCreateRequestDto,
                password,
                checkRole,
                requestLog,
                createdBy
            );

            // @note: send email after all creation
            await this.emailService.sendWelcomeByAdmin(
                created.id,
                {
                    email,
                    username: randomUsername,
                },
                {
                    password: passwordString,
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                }
            );

            return {
                data: { id: created.id },
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(created),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        }

        try {
            const updated = await this.userRepository.updateStatusByAdmin(
                userId,
                { status },
                requestLog,
                updatedBy
            );

            return {
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<UserCheckUsernameResponseDto>
    > {
        const [checkUsername, checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);

        return {
            data: {
                badWord: checkBadWord,
                exist: !!isExist,
                pattern: checkUsername,
            },
        };
    }

    async checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<
        IResponseReturn<UserCheckEmailResponseDto>
    > {
        const [checkBadWord, isExist] = await Promise.all([
            this.userUtil.checkBadWord(email),
            this.userRepository.existByEmail(email),
        ]);

        return {
            data: {
                badWord: checkBadWord,
                exist: !!isExist,
            },
        };
    }

    async getProfile(
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        const user = await this.userRepository.findOneActiveProfileById(userId);
        const mapped = this.userUtil.mapProfile(user);

        return {
            data: mapped,
        };
    }

    async updateProfile(
        userId: string,
        data: UserUpdateProfileRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            await this.userRepository.updateProfile(
                userId,
                data,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async deleteSelf(
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        try {
            const sessions = await this.sessionRepository.findAll(userId);
            await Promise.all([
                this.userRepository.deleteSelf(userId, requestLog),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const [checkUsername, checkBadWord, exist] = await Promise.all([
            this.userUtil.checkUsernamePattern(username),
            this.userUtil.checkBadWord(username),
            this.userRepository.existByUsername(username),
        ]);
        if (checkUsername) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.usernameNotAllowed,
                message: 'user.error.usernameNotAllowed',
            });
        } else if (checkBadWord) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.usernameContainBadWord,
                message: 'user.error.usernameContainBadWord',
            });
        } else if (exist) {
            throw new ConflictException({
                statusCode: EnumUserStatus_CODE_ERROR.usernameExist,
                message: 'user.error.usernameExist',
            });
        }

        try {
            await this.userRepository.claimUsername(
                userId,
                { username },
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async updatePasswordByAdmin(
        userId: string,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        }

        try {
            const passwordString = this.authUtil.createPasswordRandom();
            const password = this.authUtil.createPassword(passwordString, {
                temporary: true,
            });

            const sessions = await this.sessionRepository.findAll(userId);
            const [updated] = await Promise.all([
                this.userRepository.updatePasswordByAdmin(
                    userId,
                    password,
                    requestLog,
                    updatedBy
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            // @note: send email after all creation
            await this.emailService.sendTemporaryPassword(
                updated.id,
                {
                    email: updated.email,
                    username: updated.username,
                },
                {
                    password: passwordString,
                    passwordCreatedAt: password.passwordCreated.toISOString(),
                    passwordExpiredAt: password.passwordExpired.toISOString(),
                }
            );

            return {
                metadataActivityLog:
                    this.userUtil.mapActivityLogMetadata(updated),
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async changePassword(
        user: IUser,
        {
            newPassword,
            oldPassword,
            backupCode,
            code,
            method,
        }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        if (this.authUtil.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordAttemptMax,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (
            !this.authUtil.validatePassword(oldPassword, user.password)
        ) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordNotMatch,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        let twoFactorVerified: IAuthTwoFactorVerifyResult | undefined;
        if (user.twoFactor.enabled) {
            twoFactorVerified = await this.handleTwoFactorValidation(user, {
                code,
                backupCode,
                method,
            });
        }

        try {
            const sessions = await this.sessionRepository.findAll(user.id);
            const password = this.authUtil.createPassword(newPassword);

            await Promise.all([
                this.userRepository.changePassword(
                    user.id,
                    password,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(user.id, sessions),
                twoFactorVerified
                    ? this.userRepository.verifyTwoFactor(
                          user.id,
                          twoFactorVerified,
                          requestLog
                      )
                    : Promise.resolve(),
            ]);

            // @note: send email after all creation
            await this.emailService.sendChangePassword(user.id, {
                email: user.email,
                username: user.username,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginCredential(
        { email, password, from }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.password) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordNotSet,
                message: 'auth.error.passwordNotSet',
            });
        }

        if (this.authUtil.checkPasswordAttempt(user)) {
            await this.userRepository.reachMaxPasswordAttempt(
                user.id,
                requestLog
            );

            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordAttemptMax,
                message: 'auth.error.passwordAttemptMax',
            });
        } else if (!this.authUtil.validatePassword(password, user.password)) {
            await this.userRepository.increasePasswordAttempt(user.id);

            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordNotMatch,
                message: 'auth.error.passwordNotMatch',
            });
        }

        await this.userRepository.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authUtil.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.passwordExpired,
                message: 'auth.error.passwordExpired',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        }

        return this.handleLogin(
            user,
            from,
            requestLog
        );
    }

    async refreshToken(
        user: IUser,
        refreshToken: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const {
            sessionId,
            userId,
            jti: oldJti,
            loginFrom,
        } = this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshToken
        );

        const session = await this.sessionUtil.getLogin(userId, sessionId);
        if (session.jti !== oldJti) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenInvalid',
            });
        }

        try {
            const {
                jti: newJti,
                tokens,
                expiredInMs,
            } = this.authService.refreshToken(user, refreshToken);

            await Promise.all([
                this.sessionUtil.updateLogin(
                    userId,
                    sessionId,
                    session,
                    newJti,
                    expiredInMs
                ),
                this.userRepository.refresh(
                    userId,
                    {
                        sessionId,
                        jti: newJti,
                        expiredAt: session.expiredAt,
                        loginFrom: loginFrom,
                    },
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async signUp(
        {
            email,
            password: passwordString,
            ...others
        }: UserSignUpRequestDto,
        requestLog: IRequestLog
    ): Promise<void> {
        const [role, emailExist] = await Promise.all([
            this.roleRepository.existByName(this.userRoleName),
            this.userRepository.existByEmail(email),
        ]);
        if (!role) {
            throw new NotFoundException({
                statusCode: EnumRoleStatusCodeError.notFound,
                message: 'role.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: EnumUserStatus_CODE_ERROR.emailExist,
                message: 'user.error.emailExist',
            });
        }

        try {
            const password = this.authUtil.createPassword(passwordString);
            const randomUsername = this.userUtil.createRandomUsername();

            const created = await this.userRepository.signUp(
                randomUsername,
                role.id,
                {
                    email,
                    password: passwordString,
                    ...others,
                } as UserSignUpRequestDto,
                password,
                requestLog
            );

            // @note: send welcome email after creation
            await this.emailService.sendWelcome(created.id, {
                email: created.email,
                username: created.username,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    private async createTokenAndSession(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        requestLog: IRequestLog
    ): Promise<AuthTokenResponseDto> {
        const { tokens, sessionId, jti } = this.authService.createTokens(
            user,
            loginFrom
        );
        const expiredAt = this.helperService.dateForward(
            this.helperService.dateCreate(),
            Duration.fromObject({
                seconds: this.authUtil.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );

        await Promise.all([
            this.sessionUtil.setLogin(user.id, sessionId, jti, expiredAt),
            this.userRepository.login(
                user.id,
                {
                    loginFrom,
                    jti,
                    sessionId,
                    expiredAt,
                },
                requestLog
            ),
        ]);

        return tokens;
    }

    private async handleLogin(
        user: IUser,
        loginFrom: EnumUserLoginFrom,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        if (!user.twoFactor.enabled) {
            const tokens = await this.createTokenAndSession(
                user,
                loginFrom,
                requestLog
            );

            return {
                data: {
                    isTwoFactorEnable: false,
                    tokens,
                },
            };
        }

        const { challengeToken, expiresInMs } =
            await this.authTwoFactorUtil.createChallenge({
                userId: user.id,
                loginFrom,
            });
        if (user.twoFactor.requiredSetup) {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorUtil.setupTwoFactor(user.email);
            await this.userRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

            return {
                data: {
                    isTwoFactorEnable: true,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken,
                        challengeExpiresInMs: expiresInMs,
                        backupCodesRemaining:
                            user.twoFactor.backupCodes.length ?? 0,
                        otpauthUrl,
                        secret,
                    },
                },
            };
        }

        return {
            data: {
                isTwoFactorEnable: true,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining:
                        user.twoFactor.backupCodes.length ?? 0,
                },
            },
        };
    }

    private async handleTwoFactorValidation(
        user: IUser,
        { method, code, backupCode }: IAuthTwoFactorVerify
    ): Promise<IAuthTwoFactorVerifyResult> {
        const retryAfterMs =
            await this.authTwoFactorUtil.getLockTwoFactorAttempt(user);
        if (retryAfterMs > 0) {
            throw new RequestTooManyException({
                statusCode:
                    EnumAuthStatusCodeError.twoFactorAttemptTemporaryLock,
                message: 'auth.error.twoFactorAttemptTemporaryLock',
                messageProperties: {
                    retryAfterSeconds: retryAfterMs / 1000,
                },
            });
        }

        const verified = await this.authTwoFactorUtil.verifyTwoFactor(
            user.twoFactor,
            {
                method,
                code,
                backupCode,
            }
        );
        if (!verified.isValid) {
            await this.userRepository.increaseTwoFactorAttempt(user.id);

            if (this.authTwoFactorUtil.checkAttempt(user)) {
                await this.authTwoFactorUtil.lockTwoFactorAttempt(user);
            }

            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        await this.userRepository.resetTwoFactorAttempt(user.id);

        return verified;
    }

    async loginVerifyTwoFactor(
        {
            challengeToken,
            code,
            backupCode,
            method,
        }: UserLoginVerifyTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                message: 'auth.error.twoFactorChallengeInvalid',
            });
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        } else if (user.twoFactor.requiredSetup) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorRequiredSetup,
                message: 'auth.error.twoFactorRequiredSetup',
            });
        }

        const twoFactorVerified = await this.handleTwoFactorValidation(user, {
            method,
            code,
            backupCode,
        });

        try {
            const [tokens] = await Promise.all([
                this.createTokenAndSession(
                    user,
                    challenge.loginFrom,
                    requestLog
                ),
                this.authTwoFactorUtil.clearChallenge(challengeToken),
                this.userRepository.verifyTwoFactor(
                    user.id,
                    twoFactorVerified,
                    requestLog
                ),
            ]);

            return {
                data: tokens,
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async loginEnableTwoFactor(
        { code, challengeToken }: UserLoginEnableTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
                message: 'auth.error.twoFactorChallengeInvalid',
            });
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status !== EnumUserStatus.active) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.inactiveForbidden,
                message: 'user.error.inactive',
            });
        } else if (!user.isVerified) {
            throw new ForbiddenException({
                statusCode: EnumUserStatus_CODE_ERROR.emailNotVerified,
                message: 'user.error.emailNotVerified',
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        } else if (!user.twoFactor.requiredSetup) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotRequiredSetup,
                message: 'auth.error.twoFactorNotRequiredSetup',
            });
        }

        await this.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async getTwoFactorStatus(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        return {
            data: this.userUtil.mapTwoFactor(user.twoFactor),
        };
    }

    async setupTwoFactor(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        if (user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                message: 'auth.error.twoFactorAlreadyEnabled',
            });
        }

        try {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorUtil.setupTwoFactor(user.email);
            await this.userRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

            return {
                data: {
                    secret,
                    otpauthUrl,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        if (user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorAlreadyEnabled,
                message: 'auth.error.twoFactorAlreadyEnabled',
            });
        } else if (!user.twoFactor.iv || !user.twoFactor.secret) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorSetupRequired',
            });
        }

        const secret = this.authTwoFactorUtil.decryptSecret(
            user.twoFactor.secret,
            user.twoFactor.iv
        );
        const isValidCode = this.authTwoFactorUtil.verifyCode(secret, code);
        if (!isValidCode) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        const verified = await this.authTwoFactorUtil.verifyTwoFactor(
            user.twoFactor,
            {
                method,
                code,
                backupCode,
            }
        );
        if (!verified.isValid) {
            await this.userRepository.increaseTwoFactorAttempt(user.id);

            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.twoFactorInvalid,
                message: 'auth.error.twoFactorInvalid',
            });
        }

        try {
            await this.userRepository.disableTwoFactor(user.id, requestLog);

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userRepository.regenerateTwoFactorBackupCodes(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return {
                data: {
                    backupCodes: backupCodes.codes,
                },
            };
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>> {
        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: EnumUserStatus_CODE_ERROR.notFound,
                message: 'user.error.notFound',
            });
        } else if (user.status === EnumUserStatus.blocked) {
            throw new BadRequestException({
                statusCode: EnumUserStatus_CODE_ERROR.statusInvalid,
                message: 'user.error.statusInvalid',
                messageProperties: {
                    status: user.status.toLowerCase(),
                },
            });
        } else if (!user.twoFactor.enabled) {
            throw new BadRequestException({
                statusCode: EnumAuthStatusCodeError.twoFactorNotEnabled,
                message: 'auth.error.twoFactorNotEnabled',
            });
        }

        try {
            const sessions = await this.sessionRepository.findAll(userId);

            await Promise.all([
                this.userRepository.resetTwoFactorByAdmin(
                    userId,
                    updatedBy,
                    requestLog
                ),
                this.sessionUtil.deleteAllLogins(userId, sessions),
            ]);

            // @note: send email after all creation
            await this.emailService.sendResetTwoFactorByAdmin(user.id, {
                email: user.email,
                username: user.username,
            });

            return;
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }
}
