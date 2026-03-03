import { DatabaseService } from '@common/database/services/database.service';
import { MigrationSeedBase } from '@migration/bases/migration.seed.base';
import { IMigrationSeed } from '@migration/interfaces/migration.seed.interface';
import { Logger } from '@nestjs/common';
import { Command } from 'nest-commander';

@Command({
    name: 'merchant',
    description: 'Seed/Remove Default Merchant',
    allowUnknownOptions: false,
})
export class MigrationMerchantSeed
    extends MigrationSeedBase
    implements IMigrationSeed
{
    private readonly logger = new Logger(MigrationMerchantSeed.name);

    constructor(private readonly databaseService: DatabaseService) {
        super();
    }

    async seed(): Promise<void> {
        this.logger.log('Seeding Default Merchant...');

        try {
            await this.databaseService.merchant.upsert({
                where: { businessEmail: 'operations@vestrapay.com' },
                create: {
                    businessName: 'VestraPay',
                    businessEmail: 'operations@vestrapay.com',
                    businessPhone: '+2341234567890',
                    country: 'NG',
                    currency: 'NGN',
                    status: 'active',
                    isDefault: true,
                    metadata: {
                        description:
                            'Default VestraPay merchant for internal transactions',
                    },
                },
                update: {},
            });

            this.logger.log('Default Merchant seeded successfully.');
        } catch (error: unknown) {
            this.logger.error(error, 'Error seeding default merchant');
            throw error;
        }
    }

    async remove(): Promise<void> {
        this.logger.log('Removing Default Merchant...');

        try {
            await this.databaseService.$transaction([
                this.databaseService.transaction.deleteMany({}),
                this.databaseService.settlementAccount.deleteMany({}),
                this.databaseService.merchantKey.deleteMany({}),
                this.databaseService.merchant.deleteMany({}),
            ]);
        } catch (error: unknown) {
            this.logger.error(error, 'Error removing merchants');
            throw error;
        }

        this.logger.log('Merchants removed.');
    }
}
