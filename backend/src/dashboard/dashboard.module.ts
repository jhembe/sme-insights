import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [BusinessesModule, ExpensesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
