import {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthRefreshTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import { IUser } from '@modules/user/interfaces/user.interface';
import { EnumUserLoginFrom } from '@prisma/client';

export interface IAuthService {
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom
    ): IAuthAccessTokenGenerate;
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthRefreshTokenGenerate;
    validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload>;
    validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload>;
    validateJwtRefreshStrategy(
        payload: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload>;
    validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload>;
}
