import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { Duration, DurationLikeObject } from 'luxon';

export interface IHelperService {
    arrayUnique<T>(array: T[]): T[];
    arrayIntersection<T>(a: T[], b: T[]): T[];
    aes256Encrypt<T>(data: T, key: string, iv: string): string;
    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T;
    bcryptGenerateSalt(length: number): string;
    bcryptHash(passwordString: string, salt: string): string;
    bcryptCompare(passwordString: string, passwordHashed: string): boolean;
    sha256Hash(string: string): string;
    sha256Compare(hashOne: string, hashTwo: string): boolean;
    md5Hash(string: string): string;
    randomString(length: number): string;
    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean;
    checkEmail(value: string): IHelperEmailValidation;
    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean;
    dateCheckIso(date: string): boolean;
    dateGetZone(date: Date): string;
    dateGetTimestamp(date: Date): number;
    dateFormatToRFC2822(date: Date): string;
    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date;
    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date;
    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date;
    dateForward(date: Date, duration: Duration): Date;
    dateCreateDuration(duration: DurationLikeObject): Duration;
    dateDiff(dateOne: Date, dateTwo: Date): Duration;
    getHostname(): string;
}
