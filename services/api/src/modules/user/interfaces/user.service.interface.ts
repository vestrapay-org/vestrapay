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
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserLoginEnableTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-enable-two-factor.request.dto';

export interface IUserService {
    validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser>;
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getListCursor(
        pagination: IPaginationQueryCursorParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>>;
    getOne(id: string): Promise<IResponseReturn<UserProfileResponseDto>>;
    createByAdmin(
        { email, name, roleId }: UserCreateRequestDto,
        requestLog: IRequestLog,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>>;
    updateStatusByAdmin(
        userId: string,
        { status }: UserUpdateStatusRequestDto,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    checkUsername({
        username,
    }: UserCheckUsernameRequestDto): Promise<
        IResponseReturn<UserCheckUsernameResponseDto>
    >;
    checkEmail({
        email,
    }: UserCheckEmailRequestDto): Promise<
        IResponseReturn<UserCheckEmailResponseDto>
    >;
    getProfile(
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>>;
    updateProfile(
        userId: string,
        data: UserUpdateProfileRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    deleteSelf(
        userId: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    claimUsername(
        userId: string,
        { username }: UserClaimUsernameRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    updatePasswordByAdmin(
        userId: string,
        requestLog: IRequestLog,
        updatedBy: string
    ): Promise<IResponseReturn<void>>;
    changePassword(
        user: IUser,
        { newPassword, oldPassword }: UserChangePasswordRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    loginCredential(
        { email, password, from }: UserLoginRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserLoginResponseDto>>;
    refreshToken(
        user: IUser,
        refreshToken: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>>;
    signUp(
        { email, password, ...others }: UserSignUpRequestDto,
        requestLog: IRequestLog
    ): Promise<void>;
    loginVerifyTwoFactor(
        {
            challengeToken,
            code,
            backupCode,
            method,
        }: UserLoginVerifyTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<AuthTokenResponseDto>>;
    loginEnableTwoFactor(
        body: UserLoginEnableTwoFactorRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    getTwoFactorStatus(
        user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>>;
    setupTwoFactor(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>>;
    enableTwoFactor(
        user: IUser,
        { code }: UserTwoFactorEnableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: UserTwoFactorDisableRequestDto,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
    regenerateTwoFactorBackupCodes(
        user: IUser,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>>;
    resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<void>>;
}
