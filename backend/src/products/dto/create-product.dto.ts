import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @Type(() => Number) @IsNumber() @IsPositive() unitPrice: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stockQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lowStockThreshold?: number;
}
