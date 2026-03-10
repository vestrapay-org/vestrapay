import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '@modules/payment/services/payment.service';

@ApiTags('modules.system.payment')
@Controller({
    version: '1',
    path: '/payment',
})
export class PaymentSystemController {
    constructor(private readonly paymentService: PaymentService) {}

    @HttpCode(HttpStatus.OK)
    @Post('/webhook/alatpay/transfer')
    async alatpayTransferWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleAlatpayWebhook(body, headers);
        return { data: { received: true } };
    }

    @HttpCode(HttpStatus.OK)
    @Post('/webhook/alatpay/ussd')
    async alatpayUssdWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleAlatpayUssdWebhook(body, headers);
        return { data: { received: true } };
    }

    @HttpCode(HttpStatus.OK)
    @Post('/webhook/korapay/transfer')
    async korapayTransferWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleKorapayWebhook(body, headers);
        return { data: { received: true } };
    }
}
