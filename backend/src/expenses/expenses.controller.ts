import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Get('expense-categories')
  listCategories(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.service.listCategories(user.id, businessId);
  }

  @Post('expense-categories')
  createCategory(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.service.createCategory(user.id, businessId, dto);
  }

  @Get('expenses')
  list(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.service.list(user.id, businessId);
  }

  @Post('expenses')
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.service.create(user.id, businessId, dto);
  }

  @Patch('expenses/:expenseId')
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(user.id, businessId, expenseId, dto);
  }

  @Delete('expenses/:expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.service.remove(user.id, businessId, expenseId);
  }
}
