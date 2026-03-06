import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { PaymentPublicController } from '@modules/payment/controllers/payment.public.controller';
import { PaymentModule } from '@modules/payment/payment.module';
import { HealthPublicController } from '@modules/health/controllers/health.public.controller';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserPublicController,
        PaymentPublicController,
        HealthPublicController,
    ],
    providers: [],
    exports: [],
    imports: [UserModule, PaymentModule],
})
export class RoutesPublicModule {}
