import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [BusinessesModule, AuditModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
