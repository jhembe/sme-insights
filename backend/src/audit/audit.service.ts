import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'SALE_CREATED'
  | 'SALE_VOIDED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'STOCK_ADJUSTED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED';

export interface AuditParams {
  businessId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(params: AuditParams): void {
    // Fire-and-forget — audit failures must never block the actual operation
    this.prisma.auditEvent
      .create({ data: params })
      .catch(() => {});
  }

  async list(userId: string, businessId: string, limit = 100) {
    return this.prisma.auditEvent.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
