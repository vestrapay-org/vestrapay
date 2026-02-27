import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { MigrationApiKeySeed } from '@migration/seeds/migration.api-key.seed';
import { UserModule } from '@modules/user/user.module';
import { MigrationFeatureFlagSeed } from '@migration/seeds/migration.feature-flag.seed';
import { MigrationRoleSeed } from '@migration/seeds/migration.role.seed';
import { MigrationUserSeed } from '@migration/seeds/migration.user.seed';
import { MigrationTemplateEmailSeed } from '@migration/seeds/migration.template-email.seed';
import { EmailModule } from '@modules/email/email.module';
import { MigrationAwsS3ConfigSeed } from '@migration/seeds/migration.aws-s3-config.seed';
import { AwsModule } from '@common/aws/aws.module';

/**
 * Migration module that provides database seeding functionality.
 * Contains seed providers for API keys, roles, users, and feature flags.
 */
@Module({
    imports: [CommonModule, UserModule, EmailModule, AwsModule],
    providers: [
        MigrationApiKeySeed,
        MigrationFeatureFlagSeed,
        MigrationRoleSeed,
        MigrationUserSeed,
        MigrationTemplateEmailSeed,
        MigrationAwsS3ConfigSeed,
    ],
    exports: [],
})
export class MigrationModule {}
