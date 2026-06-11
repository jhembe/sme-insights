import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class ProductsController {
  constructor(private service: ProductsService) {}

  // ─── Categories ────────────────────────────────────────────

  @Get('categories')
  listCategories(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.service.listCategories(user.id, businessId);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(user.id, businessId, dto);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.updateCategory(user.id, businessId, categoryId, dto);
  }

  @Delete('categories/:categoryId')
  deleteCategory(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.deleteCategory(user.id, businessId, categoryId);
  }

  // ─── Products ──────────────────────────────────────────────

  @Get('products')
  list(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.id, businessId, page ? +page : 1, limit ? +limit : 200);
  }

  @Post('products')
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.create(user.id, businessId, dto);
  }

  @Patch('products/:productId')
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(user.id, businessId, productId, dto);
  }

  @Delete('products/:productId')
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.remove(user.id, businessId, productId);
  }

  // ─── Stock adjustments ──────────────────────────────────────

  @Post('products/:productId/stock-adjustments')
  addStockAdjustment(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.service.addStockAdjustment(user.id, businessId, productId, dto);
  }

  @Get('products/:productId/stock-adjustments')
  listStockAdjustments(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
  ) {
    return this.service.listStockAdjustments(user.id, businessId, productId);
  }
}
