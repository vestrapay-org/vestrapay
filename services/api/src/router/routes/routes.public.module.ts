import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserPublicController],
    providers: [],
    exports: [],
    imports: [UserModule],
})
export class RoutesPublicModule {}
