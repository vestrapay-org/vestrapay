import { SessionSharedController } from '@modules/session/controllers/session.shared.controller';
import { SessionModule } from '@modules/session/session.module';
import { UserSharedController } from '@modules/user/controllers/user.shared.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserSharedController, SessionSharedController],
    providers: [],
    exports: [],
    imports: [UserModule, SessionModule],
})
export class RoutesSharedModule {}
