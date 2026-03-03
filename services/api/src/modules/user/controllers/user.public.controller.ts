import {
    RequestIPAddress,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestUserAgentDto } from '@common/request/dtos/request.user-agent.dto';
import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { FeatureFlagProtected } from '@modules/feature-flag/decorators/feature-flag.decorator';
import {
    UserPublicLoginCredentialDoc,
    UserPublicLoginEnableTwoFactorDoc,
    UserPublicLoginVerifyTwoFactorDoc,
    UserPublicSignUpDoc,
} from '@modules/user/docs/user.public.doc';
import { UserLoginEnableTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-enable-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { UserService } from '@modules/user/services/user.service';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(private readonly userService: UserService) {}

    @UserPublicLoginCredentialDoc()
    @Response('user.loginCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @FeatureFlagProtected('loginWithCredential')
    @Post('/login/credential')
    async loginWithCredential(
        @Body() body: UserLoginRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserLoginResponseDto>> {
        return this.userService.loginCredential(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicSignUpDoc()
    @Response('user.signUp')
    @FeatureFlagProtected('signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        body: UserSignUpRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<void> {
        return this.userService.signUp(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicLoginVerifyTwoFactorDoc()
    @Response('user.verifyTwoFactor')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/verify')
    async loginVerifyTwoFactor(
        @Body() body: UserLoginVerifyTwoFactorRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<AuthTokenResponseDto>> {
        return this.userService.loginVerifyTwoFactor(body, {
            ipAddress,
            userAgent,
        });
    }

    @UserPublicLoginEnableTwoFactorDoc()
    @Response('user.loginEnableTwoFactor')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/2fa/enable')
    async verifyLoginTwoFactor(
        @Body() body: UserLoginEnableTwoFactorRequestDto,
        @RequestIPAddress() ipAddress: string,
        @RequestUserAgent() userAgent: RequestUserAgentDto
    ): Promise<IResponseReturn<UserTwoFactorEnableResponseDto>> {
        return this.userService.loginEnableTwoFactor(body, {
            ipAddress,
            userAgent,
        });
    }
}
