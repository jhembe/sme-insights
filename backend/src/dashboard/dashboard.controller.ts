import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FullAnalyticsDto } from './dto/full-analytics.dto';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.service.getSummary(user.id, businessId);
  }

  @Get('analytics')
  getAnalytics(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.service.getAnalytics(user.id, businessId);
  }

  @Get('full-analytics')
  getFullAnalytics(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query() query: FullAnalyticsDto,
  ) {
    return this.service.getFullAnalytics(
      user.id,
      businessId,
      new Date(query.dateFrom),
      new Date(query.dateTo + 'T23:59:59.999Z'),
    );
  }
}
