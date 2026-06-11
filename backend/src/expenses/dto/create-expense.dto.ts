import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString() description: string;
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
  @IsDateString() date: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() receiptUrl?: string;
}
