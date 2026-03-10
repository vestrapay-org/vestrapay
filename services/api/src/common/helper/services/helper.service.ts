import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { IHelperService } from '@common/helper/interfaces/helper.service.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { AES, MD5, SHA256, enc, lib, mode, pad } from 'crypto-js';
import { DateTime, Duration, DurationLikeObject } from 'luxon';
import _ from 'lodash';
import { EnumHelperDateDayOf } from '@common/helper/enums/helper.enum';
import { hostname } from 'os';

@Injectable()
export class HelperService implements IHelperService {
    private readonly defTz: string;

    constructor(private readonly configService: ConfigService) {
        this.defTz = this.configService.get<string>('app.timezone')!;
    }

    arrayUnique<T>(array: T[]): T[] {
        return _.uniq(array);
    }

    arrayIntersection<T>(a: T[], b: T[]): T[] {
        return _.intersection(a, b);
    }

    private parseAesIv(iv: string): lib.WordArray {
        if (!iv) {
            throw new Error('AES IV parsing failed: missing IV value');
        } else if (iv.startsWith('hex:') || iv.startsWith('b64:')) {
            const stringIv = iv.slice(4);
            if (!stringIv) {
                throw new Error('AES IV parsing failed: missing IV value');
            }

            return enc.Hex.parse(iv.slice(4));
        }

        return enc.Utf8.parse(iv);
    }

    aes256Encrypt<T>(data: T, key: string, iv: string): string {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);
        const cipher = AES.encrypt(JSON.stringify(data), cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        });

        return cipher.toString();
    }

    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T {
        const cIv = this.parseAesIv(iv);
        const cKey = SHA256(key);

        const decrypted = AES.decrypt(encrypted, cKey, {
            mode: mode.CBC,
            padding: pad.Pkcs7,
            iv: cIv,
        }).toString(enc.Utf8);

        if (!decrypted) {
            throw new Error('AES-256-CBC decryption failed');
        }

        return JSON.parse(decrypted);
    }

    bcryptGenerateSalt(length: number): string {
        return genSaltSync(length);
    }

    bcryptHash(passwordString: string, salt: string): string {
        return hashSync(passwordString, salt);
    }

    bcryptCompare(passwordString: string, passwordHashed: string): boolean {
        return compareSync(passwordString, passwordHashed);
    }

    sha256Hash(string: string): string {
        return SHA256(string).toString(enc.Hex);
    }

    sha256Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    md5Hash(string: string): string {
        return MD5(string).toString(enc.Hex);
    }

    randomString(length: number): string {
        let result = '';
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            result += characters[Math.floor(Math.random() * characters.length)];
        }

        return result;
    }

    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean {
        const length = options?.length ?? 8;
        const regex = new RegExp(
            `^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{${length},}$`
        );

        return regex.test(password);
    }

    checkEmail(value: string): IHelperEmailValidation {
        const regex = new RegExp(/\S+@\S+\.\S+/);
        const valid = regex.test(value);
        if (!valid) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalid',
            };
        }

        const atSymbolCount = (value.match(/@/g) ?? []).length;
        if (atSymbolCount !== 1) {
            return {
                validated: false,
                messagePath: 'request.error.email.multipleAtSymbols',
            };
        }

        const [localPart, domain] = value.split('@');

        if (!domain || domain.length > 253) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainLength',
            };
        } else if (domain.startsWith('-') || domain.endsWith('-')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDash',
            };
        } else if (domain.startsWith('.') || domain.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainDot',
            };
        } else if (domain.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainConsecutiveDots',
            };
        }

        const domainLabels = domain.split('.');
        if (domainLabels.length < 2) {
            return {
                validated: false,
                messagePath: 'request.error.email.domainFormat',
            };
        }

        for (const label of domainLabels) {
            if (label.length === 0) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainEmptyLabel',
                };
            } else if (label.length > 63) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelLength',
                };
            } else if (label.startsWith('-') || label.endsWith('-')) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainLabelDash',
                };
            }

            const validLabelChars = /^[a-zA-Z0-9-]+$/;
            if (!validLabelChars.test(label)) {
                return {
                    validated: false,
                    messagePath: 'request.error.email.domainInvalidChars',
                };
            }
        }

        const tld = domainLabels[domainLabels.length - 1];
        const validTLD = /^[a-zA-Z]{2,}$/;
        if (!validTLD.test(tld)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidTLD',
            };
        }

        if (!localPart || localPart.length === 0) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartNotEmpty',
            };
        } else if (localPart.length > 64) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartMaxLength',
            };
        } else if (localPart.startsWith('.') || localPart.endsWith('.')) {
            return {
                validated: false,
                messagePath: 'request.error.email.localPartDot',
            };
        } else if (localPart.includes('..')) {
            return {
                validated: false,
                messagePath: 'request.error.email.consecutiveDots',
            };
        }

        const allowedLocalPartChars = /^[a-zA-Z0-9-_.]+$/;
        if (!allowedLocalPartChars.test(localPart)) {
            return {
                validated: false,
                messagePath: 'request.error.email.invalidChars',
            };
        }

        return {
            validated: true,
        };
    }

    /**
     * Supports exact, trailing wildcard (path*), slash wildcard (path/*),
     * and full wildcard (*) patterns. Case-insensitive.
     */
    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean {
        if (!url || !patterns?.length) {
            return false;
        }

        let pathname: string;
        try {
            const urlObj = new URL(url);
            pathname = urlObj.pathname;
        } catch {
            pathname = url.split('?')[0].split('#')[0];
        }

        const normalizedPath = pathname.toLowerCase();

        return patterns.some(pattern => {
            if (!pattern) {
                return false;
            }

            const normalizedPattern = pattern.toLowerCase();

            if (normalizedPath === normalizedPattern) {
                return true;
            }

            if (!pattern.includes('*')) {
                return false;
            }

            try {
                if (normalizedPattern === '*') {
                    return true;
                }

                if (normalizedPattern.endsWith('*')) {
                    const basePattern = normalizedPattern.slice(0, -1);

                    if (!basePattern) {
                        return true;
                    }

                    if (basePattern.endsWith('/')) {
                        return normalizedPath.startsWith(basePattern);
                    }

                    return (
                        normalizedPath === basePattern ||
                        normalizedPath.startsWith(basePattern + '/')
                    );
                }

                const regexPattern = normalizedPattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');

                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(normalizedPath);
            } catch {
                return false;
            }
        });
    }

    dateCheckIso(date: string): boolean {
        return DateTime.fromISO(date).setZone(this.defTz).isValid;
    }

    dateGetZone(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).zone.name;
    }

    dateGetTimestamp(date: Date): number {
        return DateTime.fromJSDate(date).setZone(this.defTz).toMillis();
    }

    dateFormatToRFC2822(date: Date): string {
        return DateTime.fromJSDate(date).setZone(this.defTz).toRFC2822()!;
    }

    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date {
        let mDate = date
            ? DateTime.fromJSDate(date).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            mDate = mDate.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            mDate = mDate.endOf('day');
        }

        return mDate.toJSDate();
    }

    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date {
        const date = DateTime.fromISO(iso).setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date {
        const date = timestamp
            ? DateTime.fromMillis(timestamp).setZone(this.defTz)
            : DateTime.now().setZone(this.defTz);

        if (options?.dayOf && options?.dayOf === EnumHelperDateDayOf.start) {
            date.startOf('day');
        } else if (
            options?.dayOf &&
            options?.dayOf === EnumHelperDateDayOf.end
        ) {
            date.endOf('day');
        }

        return date.toJSDate();
    }

    dateForward(date: Date, duration: Duration): Date {
        return DateTime.fromJSDate(date)
            .setZone(this.defTz)
            .plus(duration)
            .toJSDate();
    }

    dateCreateDuration(duration: DurationLikeObject): Duration {
        return Duration.fromObject(duration);
    }

    dateDiff(dateOne: Date, dateTwo: Date): Duration {
        const dOne = DateTime.fromJSDate(dateOne).setZone(this.defTz);
        const dTwo = DateTime.fromJSDate(dateTwo).setZone(this.defTz);

        return dOne.diff(dTwo);
    }

    getHostname(): string {
        return hostname();
    }
}
