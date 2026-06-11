import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/subscription')
export class SubscriptionController {
  constructor(private subscription: SubscriptionService) {}

  @Get()
  get(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.subscription.getSubscription(userId, orgId);
  }
}
