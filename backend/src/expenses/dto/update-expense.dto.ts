import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() amount?: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() receiptUrl?: string;
}
