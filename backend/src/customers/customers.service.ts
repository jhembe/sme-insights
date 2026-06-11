import { Injectable, NotFoundException } from '@nestjs/common';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
  ) {}

  async list(userId: string, businessId: string, page = 1, limit = 200) {
    await this.businesses.assertOwnership(userId, businessId);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { businessId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { sales: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.customer.count({ where: { businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async create(userId: string, businessId: string, dto: CreateCustomerDto) {
    await this.businesses.assertOwnership(userId, businessId);
    return this.prisma.customer.create({
      data: { businessId, name: dto.name, phone: dto.phone, email: dto.email, notes: dto.notes },
    });
  }

  async update(userId: string, businessId: string, customerId: string, dto: Partial<CreateCustomerDto>) {
    await this.businesses.assertOwnership(userId, businessId);
    const existing = await this.prisma.customer.findFirst({ where: { id: customerId, businessId } });
    if (!existing) throw new NotFoundException('Customer not found');
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { name: dto.name, phone: dto.phone, email: dto.email, notes: dto.notes },
    });
  }

  async remove(userId: string, businessId: string, customerId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    const existing = await this.prisma.customer.findFirst({ where: { id: customerId, businessId } });
    if (!existing) throw new NotFoundException('Customer not found');
    await this.prisma.customer.delete({ where: { id: customerId } });
    return { success: true };
  }
}
