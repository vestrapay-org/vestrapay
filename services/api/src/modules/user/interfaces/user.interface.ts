import {
    EnumUserLoginFrom,
    Role,
    TwoFactor,
    User,
} from '@prisma/client';

export interface IUser extends User {
    role: Role;
    twoFactor: TwoFactor;
}

export interface IUserProfile extends IUser {}

export interface IUserLogin {
    loginFrom: EnumUserLoginFrom;
    expiredAt: Date;
    jti: string;
    sessionId: string;
}
