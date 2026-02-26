import {
    Doc,
    DocAuth,
    DocRequest,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { EnumDocRequestBodyType } from '@common/doc/enums/doc.enum';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { UserLoginEnableTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-enable-two-factor.request.dto';
import { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { UserLoginResponseDto } from '@modules/user/dtos/response/user.login.response.dto';
import { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function UserPublicLoginCredentialDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'login with credential',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginRequestDto,
        }),
        DocResponse('user.loginCredential', {
            dto: UserLoginResponseDto,
        })
    );
}

export function UserPublicSignUpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User sign up',
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserSignUpRequestDto,
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocResponse('user.signUp', {
            httpStatus: HttpStatus.CREATED,
        })
    );
}

export function UserPublicLoginVerifyTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'User verify two factor during login',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginVerifyTwoFactorRequestDto,
        }),
        DocResponse('user.loginVerifyTwoFactor', {
            dto: AuthTokenResponseDto,
        })
    );
}

export function UserPublicLoginEnableTwoFactorDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'User enable two factor during login, for required setup 2FA flow',
        }),
        DocAuth({
            xApiKey: true,
        }),
        DocRequest({
            bodyType: EnumDocRequestBodyType.json,
            dto: UserLoginEnableTwoFactorRequestDto,
        }),
        DocResponse('user.loginEnableTwoFactor', {
            dto: UserTwoFactorEnableResponseDto,
        })
    );
}
