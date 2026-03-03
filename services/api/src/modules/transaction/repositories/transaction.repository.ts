import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';
import { Transaction } from '@prisma/client';

@Injectable()
export class TransactionRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findAll(params?: {
        where?: Record<string, unknown>;
        orderBy?: Record<string, string>;
    }): Promise<Transaction[]> {
        return this.databaseService.transaction.findMany({
            where: params?.where,
            orderBy: params?.orderBy ?? { createdAt: 'desc' },
            include: {
                merchant: {
                    select: {
                        id: true,
                        businessName: true,
                    },
                },
            },
        });
    }
}
