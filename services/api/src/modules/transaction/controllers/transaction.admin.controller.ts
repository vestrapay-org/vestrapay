import { Controller, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    PolicyAbilityProtected,
} from '@modules/policy/decorators/policy.decorator';
import { EnumPolicyAction, EnumPolicySubject } from '@modules/policy/enums/policy.enum';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { EnumRoleType } from '@prisma/client';
import { TransactionService } from '@modules/transaction/services/transaction.service';
import { Response as ExpressResponse } from 'express';

@ApiTags('modules.admin.transaction')
@Controller({
    version: '1',
    path: '/transaction',
})
export class TransactionAdminController {
    constructor(private readonly transactionService: TransactionService) {}

    @PolicyAbilityProtected({
        subject: EnumPolicySubject.transaction,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/export')
    async exportTransactions(@Res() res: ExpressResponse) {
        const { headers, rows } =
            await this.transactionService.exportTransactions();

        // Build CSV
        const csvHeaders = headers.join(',');
        const csvRows = rows
            .map((row) =>
                Object.values(row)
                    .map((val) => `"${val}"`)
                    .join(',')
            )
            .join('\n');
        const csv = `${csvHeaders}\n${csvRows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=transactions_${Date.now()}.csv`
        );
        res.send(csv);
    }
}
