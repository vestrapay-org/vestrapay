import { Module } from '@nestjs/common';
import { PaymentService } from '@modules/payment/services/payment.service';
import { PaymentUtil } from '@modules/payment/utils/payment.util';
import { PaymentRepository } from '@modules/payment/repositories/payment.repository';

@Module({
    providers: [PaymentService, PaymentUtil, PaymentRepository],
    exports: [PaymentService, PaymentUtil, PaymentRepository],
    imports: [],
})
export class PaymentModule {}
