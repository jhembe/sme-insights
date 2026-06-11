import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.id, businessId, limit ? +limit : 100);
  }
}
