import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
    AuthJwtRefreshProtected,
    AuthJwtToken,
} from '@modules/auth/decorators/auth.jwt.decorator';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    UserCurrent,
    UserProtected,
} from '@modules/user/decorators/user.decorator';
import {
    UserSharedChangePasswordDoc,
    UserSharedClaimUsernameDoc,
    UserSharedProfileDoc,
    UserSharedRefreshDoc,
    UserSharedTwoFactorDisableDoc,
    UserSharedTwoFactorEnableDoc,
    UserSharedTwoFactorRegenerateBackupDoc,
    UserSharedTwoFactorSetupDoc,
    UserSharedTwoFactorStatusDoc,
    UserSharedUpdateProfileDoc,
} from '@modules/user/docs/user.shared.doc';
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
import { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(private readonly userService: UserService) {}

    @UserSharedRefreshDoc()
    @Response('user.refresh')
    @UserProtected()
    @AuthJwtRefreshProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/refresh')
    async refresh(
        @UserCurrent() user: IUser,
        @AuthJwtToken() refreshToken: string,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.refreshToken(user, refreshToken, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedProfileDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload('userId')
        userId: string
    ): Promise<IResponseReturn<UserProfileResponseDto>> {
        return this.userService.getProfile(userId);
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    async updateProfile(
        @AuthJwtPayload('userId')
        userId: string,
        @Body()
        body: UserUpdateProfileRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.updateProfile(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedChangePasswordDoc()
    @Response('user.changePassword')
    @UserProtected()
    @AuthJwtAccessProtected()
    @FeatureFlagProtected('changePassword')
    @ApiKeyProtected()
    @Patch('/change-password')
    async changePassword(
        @UserCurrent() user: IUser,
        @Body() body: UserChangePasswordRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.changePassword(user, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedClaimUsernameDoc()
    @Response('user.claimUsername')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/username/claim')
    async claimUsername(
        @AuthJwtPayload('userId') userId: string,
        @Body()
        body: UserClaimUsernameRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.claimUsername(userId, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorStatusDoc()
    @Response('user.twoFactor.status')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/2fa/status')
    async getTwoFactorStatus(
        @UserCurrent() user: IUser
    ): Promise<IResponseReturn<UserTwoFactorStatusResponseDto>> {
        return this.userService.getTwoFactorStatus(user);
    }

    @UserSharedTwoFactorSetupDoc()
    @Response('user.twoFactor.setup')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/setup')
    async setupTwoFactor(
        @UserCurrent() user: IUser,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorSetupResponseDto>> {
        return this.userService.setupTwoFactor(user, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorEnableDoc()
    @Response('user.twoFactor.enable')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/2fa/enable')
    async enableTwoFactor(
        @UserCurrent() user: IUser,
        @Body() body: UserTwoFactorEnableRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.enableTwoFactor(user, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorDisableDoc()
    @Response('user.twoFactor.disable')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Delete('/2fa/disable')
    async disableTwoFactor(
        @UserCurrent() user: IUser,
        @Body() body: UserTwoFactorDisableRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<void>> {
        return this.userService.disableTwoFactor(user, body, {
            ipAddress,
            userAgent,
        });
    }

    @UserSharedTwoFactorRegenerateBackupDoc()
    @Response('user.twoFactor.regenerateBackupCodes')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/2fa/regenerate-backup-codes')
    async regenerateTwoFactorBackupCodes(
        @UserCurrent() user: IUser,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.regenerateTwoFactorBackupCodes(user, {
            ipAddress,
            userAgent,
        });
    }
}
