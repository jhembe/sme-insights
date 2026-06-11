import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';

export interface RowError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  errors: RowError[];
}

const VALID_PAYMENT_METHODS = Object.values(PaymentMethod);
const VALID_STATUSES = Object.values(SaleStatus);

const SALES_HEADERS = [
  'date',
  'productName',
  'quantity',
  'unitPrice',
  'discount',
  'lineTotal',
  'saleTotalAmount',
  'paymentMethod',
  'status',
  'notes',
];

const PRODUCT_HEADERS = [
  'name',
  'sku',
  'description',
  'unitPrice',
  'unit',
  'stockQuantity',
  'categoryName',
];

const EXPENSE_HEADERS = [
  'date',
  'description',
  'amount',
  'category',
  'receiptUrl',
];

@Injectable()
export class ImportExportService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
  ) {}

  // ─── EXPORTS ─────────────────────────────────────────────────

  private async assertExportsAllowed(businessId: string) {
    const business = await this.prisma.businessProfile.findUnique({
      where: { id: businessId },
      include: { organization: { include: { plan: true } } },
    });
    const hasExports = business?.organization?.plan?.hasExports ?? false;
    if (!hasExports) {
      throw new ForbiddenException('Data export is not available on your current plan. Please upgrade.');
    }
  }

  async exportSales(
    userId: string,
    businessId: string,
    format: 'csv' | 'xlsx',
    startDate?: string,
    endDate?: string,
  ) {
    await this.businesses.assertMinRole(userId, businessId, 'ADMIN');
    await this.assertExportsAllowed(businessId);

    const where: Record<string, unknown> = { businessId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { items: true },
    });

    const rows: string[][] = [];
    for (const s of sales) {
      for (const item of s.items) {
        rows.push([
          s.date.toISOString().split('T')[0],
          item.productName,
          item.quantity.toString(),
          item.unitPrice.toString(),
          item.discount.toString(),
          item.lineTotal.toString(),
          s.totalAmount.toString(),
          s.paymentMethod,
          s.status,
          s.notes ?? '',
        ]);
      }
    }

    return format === 'xlsx'
      ? this.buildXlsx('Sales', SALES_HEADERS, rows)
      : this.buildCsv(SALES_HEADERS, rows);
  }

  async exportExpenses(
    userId: string,
    businessId: string,
    format: 'csv' | 'xlsx',
    startDate?: string,
    endDate?: string,
  ) {
    await this.businesses.assertMinRole(userId, businessId, 'ADMIN');
    await this.assertExportsAllowed(businessId);

    const where: Record<string, unknown> = { businessId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { category: { select: { name: true } } },
    });

    const rows = expenses.map((e) => [
      e.date.toISOString().split('T')[0],
      e.description,
      e.amount.toString(),
      e.category?.name ?? '',
      e.receiptUrl ?? '',
    ]);

    return format === 'xlsx'
      ? this.buildXlsx('Expenses', EXPENSE_HEADERS, rows)
      : this.buildCsv(EXPENSE_HEADERS, rows);
  }

  async getSalesTemplate() {
    return this.buildXlsx('Sales Import Template', SALES_HEADERS, []);
  }

  async getProductsTemplate() {
    return this.buildXlsx('Products Import Template', PRODUCT_HEADERS, []);
  }

  // ─── IMPORTS ─────────────────────────────────────────────────

  async importSales(
    userId: string,
    businessId: string,
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    await this.businesses.assertMinRole(userId, businessId, 'ADMIN');

    const rows = await this.parseFile(file);
    if (rows.length === 0) throw new BadRequestException('File is empty');

    // Normalise headers
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const col = (row: string[], name: string) => {
      const idx = headers.indexOf(name.toLowerCase());
      return idx >= 0 ? (row[idx] ?? '').trim() : '';
    };

    const errors: RowError[] = [];
    let imported = 0;
    const validRows: {
      date: Date; paymentMethod: PaymentMethod; status: SaleStatus;
      notes: string | null; productName: string; unitPrice: number;
      quantity: number; discount: number; lineTotal: number;
    }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const rowNum = i + 2;

      const date = col(r, 'date');
      const productName = col(r, 'productName');
      const quantityRaw = col(r, 'quantity');
      const unitPriceRaw = col(r, 'unitPrice');
      const paymentMethod = col(r, 'paymentMethod').toUpperCase();
      const discountRaw = col(r, 'discount') || '0';
      const statusRaw = col(r, 'status').toUpperCase() || 'COMPLETED';
      const notes = col(r, 'notes');

      if (!date) {
        errors.push({ row: rowNum, field: 'date', value: date, message: 'date is required (YYYY-MM-DD)' });
        continue;
      }
      if (isNaN(Date.parse(date))) {
        errors.push({ row: rowNum, field: 'date', value: date, message: `"${date}" is not a valid date` });
        continue;
      }
      if (!productName) {
        errors.push({ row: rowNum, field: 'productName', value: productName, message: 'productName is required' });
        continue;
      }
      const quantity = parseFloat(quantityRaw);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: rowNum, field: 'quantity', value: quantityRaw, message: `"${quantityRaw}" must be a positive number` });
        continue;
      }
      const unitPrice = parseFloat(unitPriceRaw);
      if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push({ row: rowNum, field: 'unitPrice', value: unitPriceRaw, message: `"${unitPriceRaw}" must be a non-negative number` });
        continue;
      }
      if (!VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
        errors.push({ row: rowNum, field: 'paymentMethod', value: paymentMethod, message: `"${paymentMethod}" is not valid. Use: ${VALID_PAYMENT_METHODS.join(', ')}` });
        continue;
      }
      if (!VALID_STATUSES.includes(statusRaw as SaleStatus)) {
        errors.push({ row: rowNum, field: 'status', value: statusRaw, message: `"${statusRaw}" is not valid. Use: ${VALID_STATUSES.join(', ')}` });
        continue;
      }

      const discount = parseFloat(discountRaw) || 0;
      const lineTotal = quantity * unitPrice - discount;

      validRows.push({
        date: new Date(date),
        paymentMethod: paymentMethod as PaymentMethod,
        status: statusRaw as SaleStatus,
        notes: notes || null,
        productName,
        unitPrice,
        quantity,
        discount,
        lineTotal,
      });
    }

    if (validRows.length > 0) {
      await this.prisma.$transaction(
        validRows.map((row) =>
          this.prisma.sale.create({
            data: {
              businessId,
              createdById: userId,
              date: row.date,
              taxAmount: 0,
              totalAmount: row.lineTotal,
              paymentMethod: row.paymentMethod,
              status: row.status,
              notes: row.notes,
              items: {
                create: [{
                  productName: row.productName,
                  unitPrice: row.unitPrice,
                  quantity: row.quantity,
                  discount: row.discount,
                  lineTotal: row.lineTotal,
                }],
              },
            },
          }),
        ),
      );
      imported = validRows.length;
    }

    return { imported, errors };
  }

  async importProducts(
    userId: string,
    businessId: string,
    file: Express.Multer.File,
  ): Promise<ImportResult> {
    await this.businesses.assertMinRole(userId, businessId, 'ADMIN');

    const rows = await this.parseFile(file);
    if (rows.length === 0) throw new BadRequestException('File is empty');

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    const col = (row: string[], name: string) => {
      const idx = headers.indexOf(name.toLowerCase());
      return idx >= 0 ? (row[idx] ?? '').trim() : '';
    };

    const errors: RowError[] = [];
    let imported = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const rowNum = i + 2;

      const name = col(r, 'name');
      const unitPriceRaw = col(r, 'unitPrice');
      const sku = col(r, 'sku') || null;
      const description = col(r, 'description') || null;
      const unit = col(r, 'unit') || null;
      const stockQuantityRaw = col(r, 'stockQuantity');
      const categoryName = col(r, 'categoryName') || null;

      if (!name) {
        errors.push({ row: rowNum, field: 'name', value: name, message: 'name is required' });
        continue;
      }
      const unitPrice = parseFloat(unitPriceRaw);
      if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push({ row: rowNum, field: 'unitPrice', value: unitPriceRaw, message: `"${unitPriceRaw}" must be a non-negative number` });
        continue;
      }

      let categoryId: string | null = null;
      if (categoryName) {
        const cat = await this.prisma.productCategory.upsert({
          where: { businessId_name: { businessId, name: categoryName } },
          create: { businessId, name: categoryName },
          update: {},
        });
        categoryId = cat.id;
      }

      const stockQuantity = stockQuantityRaw ? parseFloat(stockQuantityRaw) : null;
      const productData = { name, sku: sku || null, description, unitPrice, unit, stockQuantity: stockQuantity ?? null, categoryId };

      // Upsert: match on SKU (if provided) or name to avoid duplicates on re-import
      const existing = await this.prisma.product.findFirst({
        where: { businessId, isActive: true, ...(sku ? { sku } : { name }) },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.product.update({ where: { id: existing.id }, data: productData });
      } else {
        await this.prisma.product.create({ data: { businessId, ...productData } });
      }

      imported++;
    }

    return { imported, errors };
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private async parseFile(file: Express.Multer.File): Promise<string[][]> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return this.parseXlsx(file.buffer);
    }

    // Default: CSV
    const records: string[][] = parseCsv(file.buffer.toString('utf-8'), {
      relax_column_count: true,
      skip_empty_lines: true,
    }) as string[][];
    return records;
  }

  private async parseXlsx(buffer: Buffer | Uint8Array): Promise<string[][]> {
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    const rows: string[][] = [];
    ws.eachRow((row) => {
      rows.push(
        (row.values as (ExcelJS.CellValue | null)[])
          .slice(1) // ExcelJS row.values is 1-indexed, index 0 is null
          .map((v) => (v == null ? '' : String(v))),
      );
    });
    return rows;
  }

  private async buildXlsx(
    sheetName: string,
    headers: string[],
    rows: string[][],
  ) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);

    ws.addRow(headers);
    // Bold header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F5E9' },
    };

    for (const row of rows) {
      ws.addRow(row);
    }

    // Auto-fit column widths (approximate)
    ws.columns.forEach((col, i) => {
      const maxLen = Math.max(
        (headers[i] ?? '').length,
        ...rows.map((r) => (r[i] ?? '').length),
      );
      col.width = Math.min(Math.max(maxLen + 4, 12), 50);
    });

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private buildCsv(headers: string[], rows: string[][]): Buffer {
    const escape = (v: string) =>
      v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v;

    const lines = [
      headers.map(escape).join(','),
      ...rows.map((r) => r.map(escape).join(',')),
    ];
    return Buffer.from(lines.join('\r\n'), 'utf-8');
  }
}
