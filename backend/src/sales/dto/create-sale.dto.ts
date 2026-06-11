import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsString() productName: string;
  @Type(() => Number) @IsNumber() @IsPositive() unitPrice: number;
  @Type(() => Number) @IsNumber() @IsPositive() quantity: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsDateString() date: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxAmount?: number;
}
