import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
    private audit: AuditService,
  ) {}

  // ─── Categories ────────────────────────────────────────────

  async listCategories(userId: string, businessId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    return this.prisma.productCategory.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(userId: string, businessId: string, dto: CreateCategoryDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    return this.prisma.productCategory.create({
      data: { businessId, name: dto.name, color: dto.color },
    });
  }

  async updateCategory(userId: string, businessId: string, categoryId: string, dto: CreateCategoryDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const cat = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, businessId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.productCategory.update({
      where: { id: categoryId },
      data: { name: dto.name, color: dto.color },
    });
  }

  async deleteCategory(userId: string, businessId: string, categoryId: string) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const cat = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, businessId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.productCategory.delete({ where: { id: categoryId } });
  }

  // ─── Products ──────────────────────────────────────────────

  async list(userId: string, businessId: string, page = 1, limit = 200) {
    await this.businesses.assertOwnership(userId, businessId);
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        include: { category: { select: { id: true, name: true, color: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where: { businessId, isActive: true } }),
    ]);
    return { data, total, page, limit };
  }

  async create(userId: string, businessId: string, dto: CreateProductDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        categoryId: dto.categoryId,
        unitPrice: dto.unitPrice,
        unit: dto.unit,
        stockQuantity: dto.stockQuantity,
        lowStockThreshold: dto.lowStockThreshold,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    this.audit.log({ businessId, userId, action: 'PRODUCT_CREATED', entityType: 'Product', entityId: product.id, meta: { name: product.name } });
    return product;
  }

  async update(userId: string, businessId: string, productId: string, dto: UpdateProductDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const product = await this.prisma.product.findFirst({ where: { id: productId, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    this.audit.log({ businessId, userId, action: 'PRODUCT_UPDATED', entityType: 'Product', entityId: productId, meta: { name: updated.name } });
    return updated;
  }

  async remove(userId: string, businessId: string, productId: string) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const product = await this.prisma.product.findFirst({ where: { id: productId, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    this.audit.log({ businessId, userId, action: 'PRODUCT_DELETED', entityType: 'Product', entityId: productId, meta: { name: product.name } });
    return this.prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  }

  // ─── Stock adjustments ─────────────────────────────────────

  async addStockAdjustment(
    userId: string,
    businessId: string,
    productId: string,
    dto: CreateStockAdjustmentDto,
  ) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const adjustment = await this.prisma.stockAdjustment.create({
      data: {
        productId,
        businessId,
        type: dto.type,
        quantity: dto.quantity,
        note: dto.note,
        createdById: userId,
      },
    });

    if (product.stockQuantity !== null) {
      const isAddition = dto.type === 'RESTOCK' || dto.type === 'RETURN';
      await this.prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: isAddition ? { increment: dto.quantity } : { decrement: dto.quantity } },
      });
    }

    this.audit.log({
      businessId, userId, action: 'STOCK_ADJUSTED', entityType: 'Product', entityId: productId,
      meta: { productName: product.name, type: dto.type, quantity: dto.quantity, note: dto.note },
    });

    return adjustment;
  }

  async listStockAdjustments(userId: string, businessId: string, productId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.stockAdjustment.findMany({
      where: { productId, businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
