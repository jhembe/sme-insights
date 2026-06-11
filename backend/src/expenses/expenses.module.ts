import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [BusinessesModule, AuditModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
