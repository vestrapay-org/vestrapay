import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { AuthTokenResponseDto } from '@modules/auth/dtos/response/auth.token.response.dto';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import {
    IAuthAccessTokenGenerate,
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthRefreshTokenGenerate,
} from '@modules/auth/interfaces/auth.interface';
import { IAuthService } from '@modules/auth/interfaces/auth.service.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionUtil } from '@modules/session/utils/session.util';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EnumUserLoginFrom } from '@prisma/client';

/**
 * Authentication service handling JWT token operations, session validation,
 * and authentication guard validations for secure user access.
 */
@Injectable()
export class AuthService implements IAuthService {
    constructor(
        private readonly helperService: HelperService,
        private readonly authUtil: AuthUtil,
        private readonly sessionUtil: SessionUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /**
     * Creates both access and refresh tokens for a user session.
     *
     * Generates JWT tokens with current timestamp, unique session ID, and unique token identifier (jti)
     * for session tracking and security validation.
     *
     * @param user - The user entity containing profile and role information
     * @param loginFrom - The source/platform of the login (website, mobile, etc.)
     * @returns Token response object containing access token, refresh token, expiration time, jti, and sessionId
     */
    createTokens(
        user: IUser,
        loginFrom: EnumUserLoginFrom
    ): IAuthAccessTokenGenerate {
        const loginDate = this.helperService.dateCreate();

        const sessionId = this.databaseUtil.createId();
        const jti = this.authUtil.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                loginDate,
                loginFrom
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const payloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);
        const refreshToken: string = this.authUtil.createRefreshToken(
            user.id,
            jti,
            payloadRefreshToken
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.authUtil.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken,
        };

        return {
            tokens,
            jti,
            sessionId,
        };
    }

    /**
     * Refreshes an access token using a valid refresh token.
     *
     * This method extracts session and user information from the provided refresh token, then generates a new access token
     * and a new refresh token with a new token identifier (jti). The new refresh token's expiration is adjusted based on the
     * remaining validity of the original refresh token, ensuring the session does not extend beyond its original lifetime.
     *
     * @param user - The user entity containing profile and role information
     * @param refreshTokenFromRequest - The existing refresh token to extract session and expiration data from
     * @returns IAuthRefreshTokenGenerate object containing the new access token, new refresh token (with adjusted expiry), new jti, sessionId, and remaining expiration in ms
     * @throws {UnauthorizedException} If the refresh token is invalid or session validation fails
     */
    refreshToken(
        user: IUser,
        refreshTokenFromRequest: string
    ): IAuthRefreshTokenGenerate {
        const {
            sessionId,
            loginAt,
            loginFrom,
            exp: oldExp,
        } = this.authUtil.payloadToken<IAuthJwtRefreshTokenPayload>(
            refreshTokenFromRequest
        );

        const jti = this.authUtil.generateJti();
        const payloadAccessToken: IAuthJwtAccessTokenPayload =
            this.authUtil.createPayloadAccessToken(
                user,
                sessionId,
                loginAt,
                loginFrom
            );
        const accessToken: string = this.authUtil.createAccessToken(
            user.id,
            jti,
            payloadAccessToken
        );

        const newPayloadRefreshToken: IAuthJwtRefreshTokenPayload =
            this.authUtil.createPayloadRefreshToken(payloadAccessToken);

        const today = this.helperService.dateCreate();
        const expiredAt = this.helperService.dateCreateFromTimestamp(
            oldExp * 1000
        );

        const newRefreshTokenExpire = this.helperService.dateDiff(
            expiredAt,
            today
        );
        const newRefreshTokenExpireInSeconds = newRefreshTokenExpire.seconds
            ? newRefreshTokenExpire.seconds
            : Math.floor(newRefreshTokenExpire.milliseconds / 1000);

        const newRefreshToken: string = this.authUtil.createRefreshToken(
            user.id,
            jti,
            newPayloadRefreshToken,
            newRefreshTokenExpireInSeconds
        );

        const tokens: AuthTokenResponseDto = {
            tokenType: this.authUtil.jwtPrefix,
            roleType: user.role.type,
            expiresIn: this.authUtil.jwtAccessTokenExpirationTimeInSeconds,
            accessToken,
            refreshToken: newRefreshToken,
        };

        return {
            tokens,
            jti,
            sessionId,
            expiredInMs: newRefreshTokenExpire.milliseconds,
        };
    }

    /**
     * Validates the JWT access token strategy for Passport.
     *
     * Verifies that the access token payload contains required fields (sub, sessionId, jti)
     * and validates the session exists with matching token identifier to prevent session hijacking.
     *
     * @param payload - The decoded JWT access token payload
     * @returns Promise resolving to the validated payload if all checks pass
     * @throws {UnauthorizedException} When required fields are missing, invalid type, or session validation fails
     *
     * @see {@link AuthJwtAccessStrategy} for the Passport strategy that calls this method
     */
    async validateJwtAccessStrategy(
        payload: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        const { sub, sessionId, jti } = payload;

        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: EnumSessionStatusCodeError.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    /**
     * Validates the access token guard callback from Passport.
     *
     * Handles error cases that may occur during token verification and returns the authenticated user.
     * Throws an exception if authentication fails or user is not present.
     *
     * @param err - Any error that occurred during token verification
     * @param user - The authenticated user object from the decoded token
     * @param info - Additional information from the verification process
     * @returns Promise resolving to the authenticated user if validation succeeds
     * @throws {UnauthorizedException} When error exists, user is not present, or verification fails
     *
     * @see {@link AuthJwtAccessStrategy} for the Passport strategy that calls this guard
     */
    async validateJwtAccessGuard(
        err: Error,
        user: IAuthJwtAccessTokenPayload,
        info: Error
    ): Promise<IAuthJwtAccessTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        return user;
    }

    /**
     * Validates the JWT refresh token strategy for Passport.
     *
     * Verifies that the refresh token payload contains required fields (sub, sessionId, jti)
     * and validates the session exists with matching token identifier to prevent session hijacking.
     *
     * @param payload - The decoded JWT refresh token payload
     * @returns Promise resolving to the validated payload if all checks pass
     * @throws {UnauthorizedException} When required fields are missing, invalid type, or session validation fails
     *
     * @see {@link AuthJwtRefreshStrategy} for the Passport strategy that calls this method
     */
    async validateJwtRefreshStrategy(
        payload: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        const { sub, sessionId, jti } = payload;
        if (
            !sub ||
            !sessionId ||
            typeof sub !== 'string' ||
            !jti ||
            typeof jti !== 'string'
        ) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
            });
        }

        const isValidSession = await this.sessionUtil.getLogin(sub, sessionId);
        if (!isValidSession || jti !== isValidSession.jti) {
            throw new UnauthorizedException({
                statusCode: EnumSessionStatusCodeError.forbidden,
                message: 'session.error.forbidden',
            });
        }

        return payload;
    }

    /**
     * Validates the refresh token guard callback from Passport.
     *
     * Handles error cases that may occur during token verification and returns the authenticated user.
     * Throws an exception if authentication fails or user is not present.
     *
     * @param err - Any error that occurred during token verification
     * @param user - The authenticated user object from the decoded token
     * @param info - Additional information from the verification process
     * @returns Promise resolving to the authenticated user if validation succeeds
     * @throws {UnauthorizedException} When error exists, user is not present, or verification fails
     *
     */
    async validateJwtRefreshGuard(
        err: Error,
        user: IAuthJwtRefreshTokenPayload,
        info: Error
    ): Promise<IAuthJwtRefreshTokenPayload> {
        if (err || !user) {
            throw new UnauthorizedException({
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                message: 'auth.error.refreshTokenUnauthorized',
                _error: err ? err : info,
            });
        }

        return user;
    }

}
