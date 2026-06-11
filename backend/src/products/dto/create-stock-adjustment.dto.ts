import { StockAdjustmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateStockAdjustmentDto {
  @IsEnum(StockAdjustmentType) type: StockAdjustmentType;
  @Type(() => Number) @IsNumber() @IsPositive() quantity: number;
  @IsOptional() @IsString() note?: string;
}
