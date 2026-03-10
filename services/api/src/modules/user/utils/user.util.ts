import { HelperService } from '@common/helper/services/helper.service';
import { IActivityLogMetadata } from '@common/response/interfaces/response.interface';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserDto } from '@modules/user/dtos/user.dto';
import {
    IUser,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    TwoFactor,
    User,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { Profanity } from '@2toad/profanity';
import { UserTwoFactorStatusResponseDto } from '@modules/user/dtos/response/user.two-factor-status.response.dto';

@Injectable()
export class UserUtil {
    private readonly usernamePrefix: string;
    private readonly usernamePattern: RegExp;

    private readonly profanity: Profanity;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        )!;
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        )!;

        const availableLanguages = this.configService.get<string[]>(
            'message.availableLanguage'
        );
        this.profanity = new Profanity({
            languages: availableLanguages,
            wholeWord: false,
            grawlix: '*****',
            grawlixChar: '*',
        });
    }

    createRandomUsername(): string {
        const suffix = this.helperService.randomString(6);

        return `${this.usernamePrefix}-${suffix}`.toLowerCase();
    }

    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkBadWord(str: string): Promise<boolean> {
        return this.profanity.exists(str);
    }

    mapList(users: IUser[]): UserListResponseDto[] {
        return plainToInstance(UserListResponseDto, users);
    }

    mapOne(user: User): UserDto {
        return plainToInstance(UserDto, user);
    }

    mapProfile(user: IUserProfile): UserProfileResponseDto {
        return plainToInstance(UserProfileResponseDto, user);
    }

    mapTwoFactor(twoFactor: TwoFactor): UserTwoFactorStatusResponseDto {
        return {
            isEnabled: twoFactor.enabled,
            isPendingConfirmation:
                !twoFactor.enabled &&
                !!twoFactor.secret &&
                !!twoFactor.iv &&
                !twoFactor.confirmedAt,
            backupCodesRemaining: twoFactor.backupCodes.length,
            confirmedAt: twoFactor.confirmedAt ?? undefined,
            lastUsedAt: twoFactor.lastUsedAt ?? undefined,
        };
    }

    mapActivityLogMetadata(user: User): IActivityLogMetadata {
        return {
            userId: user.id,
            userUsername: user.username,
            timestamp: user.updatedAt ?? user.createdAt,
        };
    }
}
