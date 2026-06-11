import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.id, businessId, page ? +page : 1, limit ? +limit : 200);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.create(user.id, businessId, dto);
  }

  @Patch(':customerId')
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.update(user.id, businessId, customerId, dto);
  }

  @Delete(':customerId')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.service.remove(user.id, businessId, customerId);
  }
}
