import { EnumAppEnvironment } from '@app/enums/app.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperService } from '@common/helper/services/helper.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { migrationUserData } from '@migration/data/migration.user.data';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    EnumUserSignUpFrom,
    EnumUserStatus,
} from '@prisma/client';
import { Command } from 'nest-commander';

@Command({
    name: 'user',
    description: 'Seed/Remove Users',
    allowUnknownOptions: false,
})
export class MigrationUserSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationUserSeed.name);

    private readonly env: EnumAppEnvironment;
    private readonly users: {
        email: string;
        name: string;
        role: string;
        password: string;
    }[] = [];

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authUtil: AuthUtil,
        private readonly userUtil: UserUtil,
        private readonly helperService: HelperService
    ) {
        super();

        this.env = this.configService.get<EnumAppEnvironment>('app.env');
        this.users = migrationUserData[this.env];
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Users...');
        this.logger.log(`Found ${this.users.length} Users to seed.`);

        const uniqueRoles = this.helperService.arrayUnique(
            this.users.map(user => user.role)
        );
        const roles = await this.databaseService.role.findMany({
            where: {
                name: {
                    in: uniqueRoles,
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (roles.length !== uniqueRoles.length) {
            this.logger.warn('Roles not found for users, cannot seed.');
            return;
        }

        try {
            const today = this.helperService.dateCreate();

            await this.databaseService.$transaction(
                this.users.map(user => {
                    const userId = this.databaseUtil.createId();
                    const { passwordCreated, passwordExpired, passwordHash } =
                        this.authUtil.createPassword(user.password);

                    return this.databaseService.user.upsert({
                        where: {
                            email: user.email.toLowerCase(),
                        },
                        create: {
                            id: userId,
                            email: user.email.toLowerCase(),
                            name: user.name,
                            roleId: roles.find(role => role.name === user.role)
                                .id,
                            password: passwordHash,
                            passwordCreated,
                            passwordExpired,
                            passwordAttempt: 0,
                            signUpAt: today,
                            isVerified: true,
                            signUpFrom: EnumUserSignUpFrom.system,
                            status: EnumUserStatus.active,
                            username: this.userUtil.createRandomUsername(),
                            deletedAt: null,
                            twoFactor: {
                                create: {
                                    enabled: false,
                                },
                            },
                        },
                        update: {},
                    });
                })
            );
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding users');
            throw error;
        }

        this.logger.log('Users seeded successfully.');

        return;
    }

    async remove(): Promise<void> {
        this.logger.log('Removing back Users...');

        try {
            await this.databaseService.$transaction([
                this.databaseService.session.deleteMany({}),
                this.databaseService.twoFactor.deleteMany({}),
                this.databaseService.user.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing users');
            throw error;
        }

        this.logger.log('Users removed completed.');

        return;
    }
}
