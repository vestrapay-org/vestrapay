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
    @Post('/webhook/anchor')
    async anchorWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleAnchorWebhook(body, headers);
        return { data: { received: true } };
    }

    @HttpCode(HttpStatus.OK)
    @Post('/webhook/korapay')
    async korapayWebhook(
        @Body() body: Record<string, unknown>,
        @Headers() headers: Record<string, string>
    ) {
        await this.paymentService.handleKorapayWebhook(body, headers);
        return { data: { received: true } };
    }
}
