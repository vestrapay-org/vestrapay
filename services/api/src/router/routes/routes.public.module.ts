import { UserPublicController } from '@modules/user/controllers/user.public.controller';
import { UserModule } from '@modules/user/user.module';
import { PaymentPublicController } from '@modules/payment/controllers/payment.public.controller';
import { PaymentModule } from '@modules/payment/payment.module';
import { BankPublicController } from '@modules/bank/controllers/bank.public.controller';
import { BankModule } from '@modules/bank/bank.module';
import { HealthPublicController } from '@modules/health/controllers/health.public.controller';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserPublicController,
        PaymentPublicController,
        BankPublicController,
        HealthPublicController,
    ],
    providers: [],
    exports: [],
    imports: [UserModule, PaymentModule, BankModule],
})
export class RoutesPublicModule {}
