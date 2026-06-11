import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
    private audit: AuditService,
  ) {}

  async listCategories(userId: string, businessId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    return this.prisma.expenseCategory.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(
    userId: string,
    businessId: string,
    dto: CreateExpenseCategoryDto,
  ) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    return this.prisma.expenseCategory.create({
      data: { businessId, name: dto.name, color: dto.color },
    });
  }

  async list(userId: string, businessId: string) {
    await this.businesses.assertOwnership(userId, businessId);
    return this.prisma.expense.findMany({
      where: { businessId },
      orderBy: { date: 'desc' },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async create(userId: string, businessId: string, dto: CreateExpenseDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const expense = await this.prisma.expense.create({
      data: {
        businessId,
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        categoryId: dto.categoryId,
        receiptUrl: dto.receiptUrl,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    this.audit.log({
      businessId, userId, action: 'EXPENSE_CREATED', entityType: 'Expense', entityId: expense.id,
      meta: { description: expense.description, amount: Number(expense.amount) },
    });
    return expense;
  }

  async update(userId: string, businessId: string, expenseId: string, dto: UpdateExpenseDto) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, businessId } });
    if (!expense) throw new NotFoundException('Expense not found');
    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId || null }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
    this.audit.log({
      businessId, userId, action: 'EXPENSE_UPDATED', entityType: 'Expense', entityId: expenseId,
      meta: { description: updated.description, amount: Number(updated.amount) },
    });
    return updated;
  }

  async remove(userId: string, businessId: string, expenseId: string) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, businessId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.expense.delete({ where: { id: expenseId } });
    this.audit.log({
      businessId, userId, action: 'EXPENSE_DELETED', entityType: 'Expense', entityId: expenseId,
      meta: { description: expense.description, amount: Number(expense.amount) },
    });
  }
}
