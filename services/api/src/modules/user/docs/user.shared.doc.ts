import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserChangePasswordRequestDto } from '@modules/user/dtos/request/user.change-password.request.dto';
import { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import {
    UserUpdateProfileRequestDto,
} from '@modules/user/dtos/request/user.profile.request.dto';
import { UserTwoFactorDisableRequestDto } from '@modules/user/dtos/request/user.two-factor-disable.request.dto';
import { UserTwoFactorEnableRequestDto } from '@modules/user/dtos/request/user.two-factor-enable.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserTwoFactorSetupResponseDto } from '@modules/user/dtos/response/user.two-factor-setup.response.dto';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';
import { applyDecorators } from '@nestjs/common';

export function UserSharedRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'refresh token',
        }),
        DocAuth({
            xApiKey: true,
            jwtRefreshToken: true,
        }),
        DocGuard({}),
        DocResponse<AuthTokenResponseDto>('user.response', {
            dto: AuthTokenResponseDto,
        })
    );
}

export function UserSharedProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get profile',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse<UserProfileResponseDto>('user.profile', {
            dto: UserProfileResponseDto,
        })
    );
}

export function UserSharedUpdateProfileDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'update profile',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserUpdateProfileRequestDto,
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.updateProfile')
    );
}

export function UserSharedChangePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'change password',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserChangePasswordRequestDto,
        }),
        DocResponse('user.changePassword')
    );
}

export function UserSharedClaimUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'user claim username',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserClaimUsernameRequestDto,
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.claimUsername')
    );
}

export function UserSharedTwoFactorSetupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Start two-factor setup and receive secret',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.setup', {
            dto: UserTwoFactorSetupResponseDto,
        })
    );
}

export function UserSharedTwoFactorStatusDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Get current two-factor authentication status',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.status', {
            dto: UserTwoFactorStatusResponseDto,
        })
    );
}

export function UserSharedTwoFactorEnableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Enable two-factor authentication',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorEnableRequestDto,
        }),
        DocResponse('user.twoFactor.enable', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}

export function UserSharedTwoFactorDisableDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Disable two-factor authentication',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserTwoFactorDisableRequestDto,
        }),
        DocResponse('user.twoFactor.disable')
    );
}

export function UserSharedTwoFactorRegenerateBackupDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'Regenerate two-factor backup codes',
        }),
        DocGuard({}),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponse('user.twoFactor.regenerate', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}
