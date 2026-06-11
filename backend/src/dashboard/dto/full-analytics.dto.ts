import { IsDateString } from 'class-validator';

export class FullAnalyticsDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;
}
