import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';

const SALE_INCLUDE = {
  items: {
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  customer: { select: { id: true, name: true, phone: true } },
};

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
    private audit: AuditService,
  ) {}

  async list(userId: string, businessId: string, query: ListSalesDto) {
    await this.businesses.assertOwnership(userId, businessId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.SaleWhereInput = { businessId };
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }
    if (query.productId) {
      where.items = { some: { productId: query.productId } };
    }
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: SALE_INCLUDE,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, businessId: string, saleId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: SALE_INCLUDE,
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(userId: string, businessId: string, dto: CreateSaleDto) {
    await this.businesses.assertOwnership(userId, businessId);

    const taxAmount = dto.taxAmount ?? 0;
    const status = dto.paymentMethod === 'CREDIT' ? 'PENDING' : 'COMPLETED';

    const itemsWithTotals = dto.items.map((item) => ({
      ...item,
      discount: item.discount ?? 0,
      lineTotal: item.quantity * item.unitPrice - (item.discount ?? 0),
    }));

    const subtotal = itemsWithTotals.reduce((s, i) => s + i.lineTotal, 0);
    const totalAmount = subtotal + taxAmount;

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          businessId,
          createdById: userId,
          customerId: dto.customerId,
          taxAmount,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          status,
          date: new Date(dto.date),
          notes: dto.notes,
          items: {
            create: itemsWithTotals.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              discount: item.discount,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: SALE_INCLUDE,
      });

      // Deduct stock per item that has inventory tracking
      for (const item of itemsWithTotals) {
        if (!item.productId) continue;
        const product = await tx.product.findFirst({
          where: { id: item.productId, businessId },
          select: { stockQuantity: true, name: true },
        });
        if (product?.stockQuantity == null) continue;
        if (Number(product.stockQuantity) < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}": ${Number(product.stockQuantity)} available, ${item.quantity} requested.`,
          );
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      return created;
    });

    this.audit.log({
      businessId, userId, action: 'SALE_CREATED', entityType: 'Sale', entityId: sale.id,
      meta: { totalAmount: Number(sale.totalAmount), paymentMethod: sale.paymentMethod, itemCount: sale.items.length },
    });

    return sale;
  }

  async voidSale(userId: string, businessId: string, saleId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'CANCELLED') {
      throw new BadRequestException('Sale is already cancelled');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (sale.status === 'COMPLETED') {
        for (const item of sale.items) {
          if (!item.productId) continue;
          const product = await tx.product.findFirst({
            where: { id: item.productId, businessId },
            select: { stockQuantity: true },
          });
          if (product?.stockQuantity == null) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
      return tx.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
        include: SALE_INCLUDE,
      });
    });

    this.audit.log({
      businessId, userId, action: 'SALE_VOIDED', entityType: 'Sale', entityId: saleId,
      meta: { totalAmount: Number(sale.totalAmount), paymentMethod: sale.paymentMethod },
    });

    return result;
  }

  async markAsPaid(userId: string, businessId: string, saleId: string, paymentMethod: PaymentMethod) {
    await this.businesses.assertOwnership(userId, businessId);
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, businessId } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.paymentMethod !== 'CREDIT' || sale.status !== 'PENDING') {
      throw new BadRequestException('Only pending credit sales can be marked as paid');
    }
    return this.prisma.sale.update({
      where: { id: saleId },
      data: { status: 'COMPLETED', paymentMethod },
      include: SALE_INCLUDE,
    });
  }
}
