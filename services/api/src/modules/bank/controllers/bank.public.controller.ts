import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from '@common/response/decorators/response.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { BankService } from '@modules/bank/services/bank.service';

@ApiTags('modules.public.bank')
@Controller({
    version: '1',
    path: '/bank',
})
export class BankPublicController {
    constructor(private readonly bankService: BankService) {}

    @Response('bank.list')
    @ApiKeyProtected()
    @Get('/list')
    async list() {
        const banks = await this.bankService.listBanks();
        return { data: banks };
    }
}
