import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/sales')
export class SalesController {
  constructor(private service: SalesService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query() query: ListSalesDto,
  ) {
    return this.service.list(user.id, businessId, query);
  }

  @Get(':saleId')
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('saleId') saleId: string,
  ) {
    return this.service.findOne(user.id, businessId, saleId);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.service.create(user.id, businessId, dto);
  }

  @Patch(':saleId/void')
  @HttpCode(HttpStatus.OK)
  voidSale(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('saleId') saleId: string,
  ) {
    return this.service.voidSale(user.id, businessId, saleId);
  }

  @Patch(':saleId/mark-paid')
  @HttpCode(HttpStatus.OK)
  markAsPaid(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('saleId') saleId: string,
    @Body('paymentMethod') paymentMethod: PaymentMethod,
  ) {
    return this.service.markAsPaid(user.id, businessId, saleId, paymentMethod ?? 'CASH');
  }
}
