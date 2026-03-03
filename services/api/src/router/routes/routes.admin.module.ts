import { ApiKeyAdminController } from '@modules/api-key/controllers/api-key.admin.controller';
import { FeatureFlagAdminController } from '@modules/feature-flag/controllers/feature-flag.admin.controller';
import { RoleAdminController } from '@modules/role/controllers/role.admin.controller';
import { SessionAdminController } from '@modules/session/controllers/session.admin.controller';
import { SessionModule } from '@modules/session/session.module';
import { UserAdminController } from '@modules/user/controllers/user.admin.controller';
import { UserModule } from '@modules/user/user.module';
import { TransactionAdminController } from '@modules/transaction/controllers/transaction.admin.controller';
import { TransactionModule } from '@modules/transaction/transaction.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        ApiKeyAdminController,
        RoleAdminController,
        UserAdminController,
        SessionAdminController,
        FeatureFlagAdminController,
        TransactionAdminController,
    ],
    providers: [],
    exports: [],
    imports: [UserModule, SessionModule, TransactionModule],
})
export class RoutesAdminModule {}
