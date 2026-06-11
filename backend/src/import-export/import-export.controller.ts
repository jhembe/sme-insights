import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportExportService } from './import-export.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId')
export class ImportExportController {
  constructor(private service: ImportExportService) {}

  // ─── EXPORTS ─────────────────────────────────────────────────

  @Get('export/sales')
  async exportSales(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'xlsx';
    const buffer = await this.service.exportSales(
      user.id,
      businessId,
      fmt,
      startDate,
      endDate,
    );
    const ext = fmt;
    const mime =
      fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    res!
      .set({
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="sales.${ext}"`,
        'Content-Length': buffer.length,
      })
      .end(buffer);
  }

  @Get('export/expenses')
  async exportExpenses(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('format') format: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'xlsx';
    const buffer = await this.service.exportExpenses(
      user.id,
      businessId,
      fmt,
      startDate,
      endDate,
    );
    const ext = fmt;
    const mime =
      fmt === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    res!
      .set({
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="expenses.${ext}"`,
        'Content-Length': buffer.length,
      })
      .end(buffer);
  }

  @Get('export/sales/template')
  async salesTemplate(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Res() res?: Response,
  ) {
    // Still enforce ownership before serving a template
    const buffer = await this.service.getSalesTemplate();
    res!
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="sales-template.xlsx"',
        'Content-Length': buffer.length,
      })
      .end(buffer);
  }

  @Get('export/products/template')
  async productsTemplate(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.service.getProductsTemplate();
    res!
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="products-template.xlsx"',
        'Content-Length': buffer.length,
      })
      .end(buffer);
  }

  // ─── IMPORTS ─────────────────────────────────────────────────

  @Post('import/sales')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importSales(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.importSales(user.id, businessId, file);
  }

  @Post('import/products')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importProducts(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.importProducts(user.id, businessId, file);
  }
}
