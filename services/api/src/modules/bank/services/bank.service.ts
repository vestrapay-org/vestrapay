import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';
import { BANK_TRANSFER_PROCESSOR } from '@modules/processor/constants/processor.constant';
import { IBankTransferProcessor } from '@modules/processor/interfaces/bank-transfer-processor.interface';
import { Bank } from '@prisma/client';

@Injectable()
export class BankService {
    constructor(
        private readonly databaseService: DatabaseService,
        @Inject(BANK_TRANSFER_PROCESSOR)
        private readonly bankTransferProcessor: IBankTransferProcessor
    ) {}

    async listBanks(): Promise<Bank[]> {
        const banks = await this.databaseService.bank.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });

        // If no banks in DB, fetch from processor and seed
        if (banks.length === 0) {
            return this.seedBanksFromProcessor();
        }

        return banks;
    }

    private async seedBanksFromProcessor(): Promise<Bank[]> {
        const processorBanks = await this.bankTransferProcessor.listBanks();

        const created = await Promise.all(
            processorBanks.map((bank) =>
                this.databaseService.bank.upsert({
                    where: {
                        code_country: {
                            code: bank.code,
                            country: bank.country,
                        },
                    },
                    create: {
                        name: bank.name,
                        code: bank.code,
                        slug: bank.slug,
                        longCode: bank.longCode,
                        country: bank.country,
                        currency: bank.currency,
                        type: bank.type,
                        isActive: true,
                    },
                    update: {
                        name: bank.name,
                    },
                })
            )
        );

        return created;
    }
}
